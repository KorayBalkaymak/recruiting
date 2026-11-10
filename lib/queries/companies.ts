import { and, count, desc, eq, gte, ilike, inArray } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { requireCrmStaff } from "@/lib/auth/crm-access";
import { getDb } from "@/lib/db";
import {
  activityLogs,
  companies,
  companiesActive,
  companiesWithoutActiveVacancy,
  contacts,
  profiles,
  vacancies,
} from "@/lib/db/schema";
import { isDemoMode } from "@/lib/demo/mode";
import { toIso, toIsoRequired } from "@/lib/db/crm";
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

function mapCompanyRow(row: typeof companies.$inferSelect, kam?: { id: string; fullName: string } | null) {
  return {
    id: row.id,
    name: row.name,
    industry: row.industry,
    website: row.website,
    address: row.address,
    city: row.city,
    postal_code: row.postalCode,
    country: row.country,
    status: row.status,
    inactive_reason: row.inactiveReason,
    inactive_since: row.inactiveSince,
    assigned_kam_id: row.assignedKamId,
    last_contact_at: toIso(row.lastContactAt),
    notes: row.notes,
    created_at: toIsoRequired(row.createdAt),
    updated_at: toIsoRequired(row.updatedAt),
    assigned_kam: kam ? { id: kam.id, full_name: kam.fullName } : null,
  };
}

export async function getCompanyTabCounts() {
  await requireCrmStaff();
  if (isDemoMode()) {
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

  const db = getDb();
  const [[total], [neukunde], [aktiv], [ohneVakanz], [inaktiv]] = await Promise.all([
    db.select({ n: count() }).from(companies),
    db.select({ n: count() }).from(companies).where(eq(companies.status, "neukunde")),
    db.select({ n: count() }).from(companiesActive),
    db.select({ n: count() }).from(companiesWithoutActiveVacancy),
    db.select({ n: count() }).from(companies).where(eq(companies.status, "inaktiv")),
  ]);

  return {
    alle: Number(total.n),
    neukunde: Number(neukunde.n),
    aktiv: Number(aktiv.n),
    ohne_aktive_vakanz: Number(ohneVakanz.n),
    inaktiv: Number(inaktiv.n),
  };
}

async function enrichCompaniesLive(
  rows: Array<ReturnType<typeof mapCompanyRow> & { months_without_vacancy?: number | null }>
): Promise<CompanyListItem[]> {
  if (rows.length === 0) return [];
  const db = getDb();
  const ids = rows.map((r) => r.id);

  const [contactRows, activityRows, vacancyRows] = await Promise.all([
    db.select().from(contacts).where(inArray(contacts.companyId, ids)),
    db
      .select({
        id: activityLogs.id,
        entityId: activityLogs.entityId,
        type: activityLogs.type,
        content: activityLogs.content,
        createdAt: activityLogs.createdAt,
      })
      .from(activityLogs)
      .where(and(eq(activityLogs.entityType, "company"), inArray(activityLogs.entityId, ids)))
      .orderBy(desc(activityLogs.createdAt)),
    db
      .select({ companyId: vacancies.companyId, status: vacancies.status })
      .from(vacancies)
      .where(
        and(
          inArray(vacancies.companyId, ids),
          inArray(vacancies.status, ["neue_anfrage", "offen", "in_bearbeitung"])
        )
      ),
  ]);

  return rows.map((row) => ({
    ...row,
    contacts: contactRows
      .filter((c) => c.companyId === row.id)
      .map((c) => ({
        id: c.id,
        first_name: c.firstName,
        last_name: c.lastName,
        position: c.position,
        email: c.email,
        phone: c.phone,
        is_primary: c.isPrimary,
      })),
    recent_activity: activityRows
      .filter((a) => a.entityId === row.id)
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        type: a.type,
        content: a.content,
        created_at: toIsoRequired(a.createdAt),
      })),
    open_vacancies_count: vacancyRows.filter((v) => v.companyId === row.id).length,
  }));
}

export async function getCompanies(
  tab: CompanyTab,
  options: { minMonthsWithoutVacancy?: number; search?: string } = {}
): Promise<CompanyListItem[]> {
  await requireCrmStaff();
  if (isDemoMode()) {
    const supabase = createClient();
    if (tab === "aktiv") {
      let query = supabase
        .from("v_companies_active")
        .select("*, assigned_kam:profiles(id, full_name)")
        .order("last_contact_at", { ascending: false });
      if (options.search) query = query.ilike("name", `%${options.search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return enrichCompaniesDemo(data ?? []);
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
      return enrichCompaniesDemo(data ?? []);
    }
    let query = supabase
      .from("companies")
      .select("*, assigned_kam:profiles(id, full_name)")
      .order("updated_at", { ascending: false });
    if (tab !== "alle") query = query.eq("status", tab as CompanyStatus);
    if (options.search) query = query.ilike("name", `%${options.search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return enrichCompaniesDemo(data ?? []);
  }

  const db = getDb();

  if (tab === "aktiv") {
    const filters = [];
    if (options.search?.trim()) filters.push(ilike(companiesActive.name, `%${options.search.trim()}%`));
    const rows = await db
      .select({
        id: companiesActive.id,
        name: companiesActive.name,
        industry: companiesActive.industry,
        website: companiesActive.website,
        address: companiesActive.address,
        city: companiesActive.city,
        postalCode: companiesActive.postalCode,
        country: companiesActive.country,
        status: companiesActive.status,
        inactiveReason: companiesActive.inactiveReason,
        inactiveSince: companiesActive.inactiveSince,
        assignedKamId: companiesActive.assignedKamId,
        lastContactAt: companiesActive.lastContactAt,
        notes: companiesActive.notes,
        createdAt: companiesActive.createdAt,
        updatedAt: companiesActive.updatedAt,
        kamId: profiles.id,
        kamName: profiles.fullName,
      })
      .from(companiesActive)
      .leftJoin(profiles, eq(profiles.id, companiesActive.assignedKamId))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(companiesActive.lastContactAt));
    return enrichCompaniesLive(
      rows.map((r) =>
        mapCompanyRow(
          {
            id: r.id,
            name: r.name,
            industry: r.industry,
            website: r.website,
            address: r.address,
            city: r.city,
            postalCode: r.postalCode,
            country: r.country,
            status: r.status,
            inactiveReason: r.inactiveReason,
            inactiveSince: r.inactiveSince,
            assignedKamId: r.assignedKamId,
            lastContactAt: r.lastContactAt,
            notes: r.notes,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          },
          r.kamId ? { id: r.kamId, fullName: r.kamName! } : null
        )
      )
    );
  }

  if (tab === "ohne_aktive_vakanz") {
    const filters = [];
    if (options.minMonthsWithoutVacancy != null) {
      filters.push(gte(companiesWithoutActiveVacancy.monthsWithoutVacancy, options.minMonthsWithoutVacancy));
    }
    if (options.search?.trim()) {
      filters.push(ilike(companiesWithoutActiveVacancy.name, `%${options.search.trim()}%`));
    }
    const rows = await db
      .select({
        id: companiesWithoutActiveVacancy.id,
        name: companiesWithoutActiveVacancy.name,
        industry: companiesWithoutActiveVacancy.industry,
        website: companiesWithoutActiveVacancy.website,
        address: companiesWithoutActiveVacancy.address,
        city: companiesWithoutActiveVacancy.city,
        postalCode: companiesWithoutActiveVacancy.postalCode,
        country: companiesWithoutActiveVacancy.country,
        status: companiesWithoutActiveVacancy.status,
        inactiveReason: companiesWithoutActiveVacancy.inactiveReason,
        inactiveSince: companiesWithoutActiveVacancy.inactiveSince,
        assignedKamId: companiesWithoutActiveVacancy.assignedKamId,
        lastContactAt: companiesWithoutActiveVacancy.lastContactAt,
        notes: companiesWithoutActiveVacancy.notes,
        createdAt: companiesWithoutActiveVacancy.createdAt,
        updatedAt: companiesWithoutActiveVacancy.updatedAt,
        monthsWithoutVacancy: companiesWithoutActiveVacancy.monthsWithoutVacancy,
        kamId: profiles.id,
        kamName: profiles.fullName,
      })
      .from(companiesWithoutActiveVacancy)
      .leftJoin(profiles, eq(profiles.id, companiesWithoutActiveVacancy.assignedKamId))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(companiesWithoutActiveVacancy.monthsWithoutVacancy));
    return enrichCompaniesLive(
      rows.map((r) => ({
        ...mapCompanyRow(
          {
            id: r.id,
            name: r.name,
            industry: r.industry,
            website: r.website,
            address: r.address,
            city: r.city,
            postalCode: r.postalCode,
            country: r.country,
            status: r.status,
            inactiveReason: r.inactiveReason,
            inactiveSince: r.inactiveSince,
            assignedKamId: r.assignedKamId,
            lastContactAt: r.lastContactAt,
            notes: r.notes,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          },
          r.kamId ? { id: r.kamId, fullName: r.kamName! } : null
        ),
        months_without_vacancy: r.monthsWithoutVacancy ?? null,
      }))
    );
  }

  const filters = [];
  if (tab !== "alle") filters.push(eq(companies.status, tab));
  if (options.search?.trim()) filters.push(ilike(companies.name, `%${options.search.trim()}%`));
  const rows = await db
    .select({
      company: companies,
      kamId: profiles.id,
      kamName: profiles.fullName,
    })
    .from(companies)
    .leftJoin(profiles, eq(profiles.id, companies.assignedKamId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(companies.updatedAt));

  return enrichCompaniesLive(
    rows.map((r) =>
      mapCompanyRow(r.company, r.kamId ? { id: r.kamId, fullName: r.kamName! } : null)
    )
  );
}

async function enrichCompaniesDemo(
  rows: { id: string; [key: string]: unknown }[]
): Promise<CompanyListItem[]> {
  if (rows.length === 0) return [];
  const supabase = createClient();
  const ids = rows.map((r) => r.id);
  const [{ data: contactData }, { data: activity }, { data: vacancyCounts }] = await Promise.all([
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
    contacts: (contactData ?? []).filter(
      (c: { company_id: string }) => c.company_id === row.id
    ) as CompanyContact[],
    recent_activity: (activity ?? [])
      .filter((a: { entity_id: string }) => a.entity_id === row.id)
      .slice(0, 5) as CompanyActivity[],
    open_vacancies_count: (vacancyCounts ?? []).filter(
      (v: { company_id: string }) => v.company_id === row.id
    ).length,
  }));
}

export async function getCompanyById(id: string) {
  await requireCrmStaff();
  if (isDemoMode()) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("companies")
      .select("*, assigned_kam:profiles(id, full_name), contacts(*)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  }

  const db = getDb();
  const [row] = await db
    .select({
      company: companies,
      kamId: profiles.id,
      kamName: profiles.fullName,
    })
    .from(companies)
    .leftJoin(profiles, eq(profiles.id, companies.assignedKamId))
    .where(eq(companies.id, id))
    .limit(1);
  if (!row) throw new Error("Kunde nicht gefunden.");

  const contactRows = await db.select().from(contacts).where(eq(contacts.companyId, id));
  return {
    ...mapCompanyRow(row.company, row.kamId ? { id: row.kamId, fullName: row.kamName! } : null),
    contacts: contactRows.map((c) => ({
      id: c.id,
      company_id: c.companyId,
      first_name: c.firstName,
      last_name: c.lastName,
      position: c.position,
      email: c.email,
      phone: c.phone,
      is_primary: c.isPrimary,
      created_at: toIsoRequired(c.createdAt),
      updated_at: toIsoRequired(c.updatedAt),
    })),
  };
}
