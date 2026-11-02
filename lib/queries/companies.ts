import { createClient } from "@/lib/supabase/server";
import type { CompanyStatus } from "@/types/supabase";

export type CompanyContact = {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
};

export type CompanyActivity = {
  id: string;
  type: string;
  content: string;
  created_at: string;
};

export type CompanyListItem = {
  id: string;
  name: string;
  industry: string | null;
  city: string | null;
  status: CompanyStatus;
  inactive_reason: string | null;
  inactive_since: string | null;
  last_contact_at: string | null;
  months_without_vacancy?: number | null;
  assigned_kam: { id: string; full_name: string } | null;
  contacts: CompanyContact[];
  recent_activity: CompanyActivity[];
  open_vacancies_count: number;
};

export type CompanyTab = "alle" | "neukunde" | "aktiv" | "ohne_aktive_vakanz" | "inaktiv";

export async function getCompanyTabCounts() {
  const supabase = createClient();

  const [total, neukunde, aktiv, ohneVakanz, inaktiv] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("status", "neukunde"),
    supabase.from("v_companies_active").select("id", { count: "exact", head: true }),
    supabase.from("v_companies_without_active_vacancy").select("id", { count: "exact", head: true }),
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("status", "inaktiv"),
  ]);

  return {
    alle: total.count ?? 0,
    neukunde: neukunde.count ?? 0,
    aktiv: aktiv.count ?? 0,
    ohne_aktive_vakanz: ohneVakanz.count ?? 0,
    inaktiv: inaktiv.count ?? 0,
  };
}

async function enrichCompanies(
  rows: { id: string; [key: string]: unknown }[]
): Promise<CompanyListItem[]> {
  if (rows.length === 0) return [];
  const supabase = createClient();
  const ids = rows.map((r) => r.id);

  const [{ data: contacts }, { data: activity }, { data: vacancyCounts }] = await Promise.all([
    supabase.from("contacts").select("*").in("company_id", ids),
    supabase
      .from("activity_logs")
      .select("id, entity_id, type, content, created_at")
      .eq("entity_type", "company")
      .in("entity_id", ids)
      .order("created_at", { ascending: false }),
    supabase
      .from("vacancies")
      .select("company_id, status")
      .in("company_id", ids)
      .in("status", ["neue_anfrage", "offen", "in_bearbeitung"]),
  ]);

  return rows.map((row) => ({
    ...(row as any),
    assigned_kam: (row as any).assigned_kam
      ? { id: (row as any).assigned_kam.id, full_name: (row as any).assigned_kam.full_name }
      : null,
    contacts: (contacts ?? []).filter((c) => c.company_id === row.id) as CompanyContact[],
    recent_activity: (activity ?? [])
      .filter((a) => a.entity_id === row.id)
      .slice(0, 5) as CompanyActivity[],
    open_vacancies_count: (vacancyCounts ?? []).filter((v) => v.company_id === row.id).length,
  }));
}

export async function getCompanies(
  tab: CompanyTab,
  options: { minMonthsWithoutVacancy?: number; search?: string } = {}
): Promise<CompanyListItem[]> {
  const supabase = createClient();

  if (tab === "aktiv") {
    let query = supabase
      .from("v_companies_active")
      .select("*, assigned_kam:profiles(id, full_name)")
      .order("last_contact_at", { ascending: false });
    if (options.search) query = query.ilike("name", `%${options.search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return enrichCompanies(data ?? []);
  }

  if (tab === "ohne_aktive_vakanz") {
    let query = supabase
      .from("v_companies_without_active_vacancy")
      .select("*, assigned_kam:profiles(id, full_name)")
      .order("months_without_vacancy", { ascending: false });
    if (options.minMonthsWithoutVacancy) {
      query = query.gte("months_without_vacancy", options.minMonthsWithoutVacancy);
    }
    if (options.search) query = query.ilike("name", `%${options.search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return enrichCompanies(data ?? []);
  }

  let query = supabase
    .from("companies")
    .select("*, assigned_kam:profiles(id, full_name)")
    .order("updated_at", { ascending: false });

  if (tab !== "alle") {
    query = query.eq("status", tab as CompanyStatus);
  }
  if (options.search) {
    query = query.ilike("name", `%${options.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return enrichCompanies(data ?? []);
}

export async function getCompanyById(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*, assigned_kam:profiles(id, full_name), contacts(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}
