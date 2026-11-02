import { createClient } from "@/lib/supabase/server";

export async function getContracts() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contracts")
    .select(
      `id, contract_number, status, start_date, end_date, hourly_rate, fee, currency, created_at,
       company:companies(id, name),
       candidate:candidates(id, first_name, last_name),
       vacancy:vacancies(id, title)`
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Besetzte Vakanzen, für die noch kein Vertrag existiert
export async function getFillableVacancies() {
  const supabase = createClient();
  const { data: filled, error } = await supabase
    .from("vacancies")
    .select(
      `id, title, filled_start_date, filled_fee, currency, company_id,
       company:companies(id, name),
       filled_candidate:candidates!vacancies_filled_candidate_id_fkey(id, first_name, last_name)`
    )
    .eq("status", "besetzt");
  if (error) throw error;

  const { data: existingContracts } = await supabase.from("contracts").select("vacancy_id");
  const contractedIds = new Set((existingContracts ?? []).map((c) => c.vacancy_id));

  return (filled ?? []).filter((v) => !contractedIds.has(v.id));
}
