import { createClient } from "@/lib/supabase/server";
import type { CandidateStatus } from "@/types/supabase";

export type CandidateListItem = {
  id: string;
  first_name: string;
  last_name: string;
  anonymized_title: string | null;
  status: CandidateStatus;
  location: string | null;
  hourly_rate_net: number | null;
  availability_date: string | null;
  updated_at: string;
  assigned_recruiter: { full_name: string } | null;
};

const statusOrder: CandidateStatus[] = [
  "neu_eingegangen",
  "in_bearbeitung",
  "profil_fertig",
  "in_einreichung",
  "inaktiv",
];

export async function getCandidateTabCounts() {
  const supabase = createClient();

  const counts = await Promise.all(
    statusOrder.map((status) =>
      supabase.from("candidates").select("id", { count: "exact", head: true }).eq("status", status)
    )
  );

  const total = counts.reduce((sum, result) => sum + (result.count ?? 0), 0);

  return {
    alle: total,
    neu_eingegangen: counts[0].count ?? 0,
    in_bearbeitung: counts[1].count ?? 0,
    profil_fertig: counts[2].count ?? 0,
    in_einreichung: counts[3].count ?? 0,
    inaktiv: counts[4].count ?? 0,
  };
}

export async function getCandidates(tab: string, search?: string) {
  const supabase = createClient();

  let query = supabase
    .from("candidates")
    .select(
      "id, first_name, last_name, anonymized_title, status, location, hourly_rate_net, availability_date, updated_at, assigned_recruiter:profiles(full_name)"
    )
    .order("updated_at", { ascending: false });

  if (tab !== "alle") {
    query = query.eq("status", tab as CandidateStatus);
  }

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,anonymized_title.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as CandidateListItem[];
}

export async function getCandidateById(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("candidates")
    .select(
      "*, assigned_recruiter:profiles(id, full_name), submissions:vacancy_submissions(id, status, match_score, vacancy:vacancies(id, title))"
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}
