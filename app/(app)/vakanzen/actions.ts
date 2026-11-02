"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EmploymentType, VacancySource } from "@/types/supabase";

type VacancyCloseReason =
  | "kunde_storniert"
  | "position_intern_besetzt"
  | "budget_gestrichen"
  | "kein_geeigneter_kandidat"
  | "sonstiges";

async function logActivity(
  supabase: ReturnType<typeof createClient>,
  entityId: string,
  content: string,
  type: string = "statusaenderung"
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("activity_logs").insert({
    entity_type: "vacancy",
    entity_id: entityId,
    type,
    content,
    created_by: user?.id ?? null,
  });
}

export async function createVacancy(input: {
  companyId: string;
  contactId?: string;
  title: string;
  source: VacancySource;
  employmentType: EmploymentType;
  requirements?: string;
  budgetMin?: number;
  budgetMax?: number;
  currency: string;
  location?: string;
  startDate?: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("vacancies")
    .insert({
      company_id: input.companyId,
      contact_id: input.contactId || null,
      title: input.title,
      source: input.source,
      employment_type: input.employmentType,
      requirements: input.requirements || null,
      budget_min: input.budgetMin ?? null,
      budget_max: input.budgetMax ?? null,
      currency: input.currency,
      location: input.location || null,
      start_date: input.startDate || null,
      status: "neue_anfrage",
      assigned_recruiter_id: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;

  await logActivity(supabase, data.id, "Vakanz angelegt.", "notiz");
  revalidatePath("/vakanzen");
  redirect(`/vakanzen/${data.id}`);
}

export async function publishVacancy(vacancyId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("vacancies")
    .update({ status: "offen" })
    .eq("id", vacancyId);
  if (error) throw error;

  await logActivity(supabase, vacancyId, "Anfrage als offene Vakanz veröffentlicht.");
  revalidatePath("/vakanzen");
  revalidatePath(`/vakanzen/${vacancyId}`);
}

export async function mergeRequestIntoVacancy(requestVacancyId: string, targetVacancyId: string) {
  const supabase = createClient();
  const { data: target } = await supabase
    .from("vacancies")
    .select("title")
    .eq("id", targetVacancyId)
    .single();

  const { error } = await supabase
    .from("vacancies")
    .update({
      status: "geschlossen",
      close_reason: "sonstiges" as VacancyCloseReason,
      close_notes: `Zusammengeführt mit bestehender Vakanz „${target?.title ?? targetVacancyId}“.`,
    })
    .eq("id", requestVacancyId);

  if (error) throw error;

  await logActivity(supabase, requestVacancyId, `Anfrage zugeordnet zu Vakanz „${target?.title}“.`);
  await logActivity(supabase, targetVacancyId, "Zusätzliche Anfrage wurde dieser Vakanz zugeordnet.", "notiz");

  revalidatePath("/vakanzen");
}

export async function startProcessing(vacancyId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("vacancies")
    .update({ status: "in_bearbeitung" })
    .eq("id", vacancyId);
  if (error) throw error;

  await logActivity(supabase, vacancyId, "Status geändert auf „In Bearbeitung“.");
  revalidatePath("/vakanzen");
  revalidatePath(`/vakanzen/${vacancyId}`);
}

export async function fillVacancy(
  vacancyId: string,
  candidateId: string,
  startDate: string,
  fee: number
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("vacancies")
    .update({
      status: "besetzt",
      filled_candidate_id: candidateId,
      filled_start_date: startDate,
      filled_fee: fee,
    })
    .eq("id", vacancyId);
  if (error) throw error;

  await supabase
    .from("candidates")
    .update({ status: "in_einreichung" })
    .eq("id", candidateId);

  await logActivity(supabase, vacancyId, "Vakanz erfolgreich besetzt.");
  revalidatePath("/vakanzen");
  revalidatePath(`/vakanzen/${vacancyId}`);
}

export async function closeVacancy(
  vacancyId: string,
  reason: VacancyCloseReason,
  notes?: string
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("vacancies")
    .update({ status: "geschlossen", close_reason: reason, close_notes: notes || null })
    .eq("id", vacancyId);
  if (error) throw error;

  await logActivity(supabase, vacancyId, `Vakanz geschlossen (Grund: ${reason}).`);
  revalidatePath("/vakanzen");
  revalidatePath(`/vakanzen/${vacancyId}`);
}

export async function addCandidateToMatching(
  vacancyId: string,
  candidateId: string,
  matchScore?: number
) {
  const supabase = createClient();
  const { error } = await supabase.from("vacancy_submissions").insert({
    vacancy_id: vacancyId,
    candidate_id: candidateId,
    match_score: matchScore ?? null,
    status: "vorgeschlagen",
  });
  if (error) throw error;

  revalidatePath(`/vakanzen/${vacancyId}`);
}

export async function updateSubmissionStatus(
  submissionId: string,
  vacancyId: string,
  status: string
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("vacancy_submissions")
    .update({ status, submitted_at: status === "angefragt" ? new Date().toISOString() : undefined })
    .eq("id", submissionId);
  if (error) throw error;

  revalidatePath(`/vakanzen/${vacancyId}`);
}
