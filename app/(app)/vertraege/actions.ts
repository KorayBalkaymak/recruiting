"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { contracts, vacancies } from "@/lib/db/schema";
import { isDemoMode } from "@/lib/demo/mode";
import type { ContractStatus } from "@/types/supabase";
import { requireStaff } from "@/lib/auth";

function generateContractNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `V-${year}-${random}`;
}

export async function createContractFromVacancy(vacancyId: string) {
  const staff = await requireStaff();

  if (isDemoMode()) {
    const supabase = createClient();
    const { data: vacancy, error: vacancyError } = await supabase
      .from("vacancies")
      .select("id, company_id, filled_candidate_id, filled_start_date, filled_fee, currency")
      .eq("id", vacancyId)
      .single();
    if (vacancyError) throw vacancyError;

    const { error } = await supabase.from("contracts").insert({
      vacancy_id: vacancy.id,
      candidate_id: vacancy.filled_candidate_id,
      company_id: vacancy.company_id,
      contract_number: generateContractNumber(),
      status: "entwurf",
      start_date: vacancy.filled_start_date,
      fee: vacancy.filled_fee,
      currency: vacancy.currency,
      created_by: staff.id,
    });
    if (error) throw error;
  } else {
    const db = getDb();
    const [vacancy] = await db
      .select({
        id: vacancies.id,
        companyId: vacancies.companyId,
        filledCandidateId: vacancies.filledCandidateId,
        filledStartDate: vacancies.filledStartDate,
        filledFee: vacancies.filledFee,
        currency: vacancies.currency,
      })
      .from(vacancies)
      .where(eq(vacancies.id, vacancyId))
      .limit(1);

    if (!vacancy) throw new Error("Vakanz nicht gefunden.");

    await db.insert(contracts).values({
      vacancyId: vacancy.id,
      candidateId: vacancy.filledCandidateId,
      companyId: vacancy.companyId,
      contractNumber: generateContractNumber(),
      status: "entwurf",
      startDate: vacancy.filledStartDate,
      fee: vacancy.filledFee,
      currency: vacancy.currency,
      createdBy: staff.id,
    });
  }

  revalidatePath("/vertraege");
}

export async function updateContractStatus(contractId: string, status: ContractStatus) {
  await requireStaff();

  if (isDemoMode()) {
    const supabase = createClient();
    const { error } = await supabase.from("contracts").update({ status }).eq("id", contractId);
    if (error) throw error;
  } else {
    await getDb()
      .update(contracts)
      .set({ status, updatedAt: new Date() })
      .where(eq(contracts.id, contractId));
  }

  revalidatePath("/vertraege");
}
