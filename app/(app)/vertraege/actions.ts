"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ContractStatus } from "@/types/supabase";

function generateContractNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `V-${year}-${random}`;
}

export async function createContractFromVacancy(vacancyId: string) {
  const supabase = createClient();
  const { data: vacancy, error: vacancyError } = await supabase
    .from("vacancies")
    .select("id, company_id, filled_candidate_id, filled_start_date, filled_fee, currency")
    .eq("id", vacancyId)
    .single();

  if (vacancyError) throw vacancyError;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("contracts").insert({
    vacancy_id: vacancy.id,
    candidate_id: vacancy.filled_candidate_id,
    company_id: vacancy.company_id,
    contract_number: generateContractNumber(),
    status: "entwurf",
    start_date: vacancy.filled_start_date,
    fee: vacancy.filled_fee,
    currency: vacancy.currency,
    created_by: user?.id ?? null,
  });

  if (error) throw error;
  revalidatePath("/vertraege");
}

export async function updateContractStatus(contractId: string, status: ContractStatus) {
  const supabase = createClient();
  const { error } = await supabase.from("contracts").update({ status }).eq("id", contractId);
  if (error) throw error;
  revalidatePath("/vertraege");
}
