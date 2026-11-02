import { createClient } from "@/lib/supabase/server";
import type { VacancyStatus } from "@/types/supabase";

const statusOrder: VacancyStatus[] = ["neue_anfrage", "offen", "in_bearbeitung", "besetzt", "geschlossen"];

export async function getVacancyTabCounts() {
  const supabase = createClient();
  const counts = await Promise.all(
    statusOrder.map((status) =>
      supabase.from("vacancies").select("id", { count: "exact", head: true }).eq("status", status)
    )
  );
  return {
    neue_anfrage: counts[0].count ?? 0,
    offen: counts[1].count ?? 0,
    in_bearbeitung: counts[2].count ?? 0,
    besetzt: counts[3].count ?? 0,
    geschlossen: counts[4].count ?? 0,
  };
}

export async function getVacancies(tab: VacancyStatus) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vacancies")
    .select(
      `id, title, source, status, employment_type, budget_min, budget_max, currency, location,
       filled_start_date, filled_fee, close_reason, created_at, updated_at,
       company:companies(id, name),
       filled_candidate:candidates!vacancies_filled_candidate_id_fkey(id, first_name, last_name),
       assigned_recruiter:profiles(id, full_name),
       submissions:vacancy_submissions(id)`
    )
    .eq("status", tab)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getVacancyById(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vacancies")
    .select(
      `*, company:companies(id, name, industry, city),
       contact:contacts(id, first_name, last_name, email, phone),
       assigned_recruiter:profiles(id, full_name),
       filled_candidate:candidates!vacancies_filled_candidate_id_fkey(id, first_name, last_name),
       submissions:vacancy_submissions(
         id, match_score, status, submitted_at, feedback,
         candidate:candidates(id, first_name, last_name, anonymized_title, status, hourly_rate_net, location)
       )`
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function getOpenVacanciesForCompany(companyId: string, excludeId?: string) {
  const supabase = createClient();
  let query = supabase
    .from("vacancies")
    .select("id, title, status")
    .eq("company_id", companyId)
    .in("status", ["offen", "in_bearbeitung"]);

  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getCandidatesForMatching(excludeIds: string[]) {
  const supabase = createClient();
  let query = supabase
    .from("candidates")
    .select("id, first_name, last_name, anonymized_title, status, hourly_rate_net, location")
    .neq("status", "inaktiv")
    .order("updated_at", { ascending: false })
    .limit(50);

  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
