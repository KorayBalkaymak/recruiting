"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { candidates, vacancies, vacancySubmissions } from "@/lib/db/schema";
import { insertActivityLog } from "@/lib/db/crm";
import { isDemoMode } from "@/lib/demo/mode";
import type { EmploymentType, VacancySource } from "@/types/supabase";
import { requireStaff } from "@/lib/auth";

type VacancyCloseReason =
  | "kunde_storniert"
  | "position_intern_besetzt"
  | "budget_gestrichen"
  | "kein_geeigneter_kandidat"
  | "sonstiges";

type SubmissionStatus =
  | "vorgeschlagen"
  | "angefragt"
  | "in_pruefung"
  | "verfuegbar"
  | "abgelehnt"
  | "vorstellungsgespraech"
  | "besetzt";

async function logVacancyActivity(
  entityId: string,
  content: string,
  createdBy: string,
  type: "notiz" | "statusaenderung" = "statusaenderung"
) {
  if (isDemoMode()) {
    const supabase = createClient();
    await supabase.from("activity_logs").insert({
      entity_type: "vacancy",
      entity_id: entityId,
      type,
      content,
      created_by: createdBy,
    });
    return;
  }
  await insertActivityLog({
    entityType: "vacancy",
    entityId,
    type,
    content,
    createdBy,
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
  const staff = await requireStaff();

  if (isDemoMode()) {
    const supabase = createClient();
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
        assigned_recruiter_id: staff.id,
      })
      .select("id")
      .single();
    if (error) throw error;
    await logVacancyActivity(data.id, "Vakanz angelegt.", staff.id, "notiz");
    revalidatePath("/vakanzen");
    redirect(`/vakanzen/${data.id}`);
  }

  const [created] = await getDb()
    .insert(vacancies)
    .values({
      companyId: input.companyId,
      contactId: input.contactId || null,
      title: input.title,
      source: input.source,
      employmentType: input.employmentType,
      requirements: input.requirements || null,
      budgetMin: input.budgetMin != null ? String(input.budgetMin) : null,
      budgetMax: input.budgetMax != null ? String(input.budgetMax) : null,
      currency: input.currency,
      location: input.location || null,
      startDate: input.startDate || null,
      status: "neue_anfrage",
      assignedRecruiterId: staff.id,
    })
    .returning({ id: vacancies.id });

  await logVacancyActivity(created.id, "Vakanz angelegt.", staff.id, "notiz");
  revalidatePath("/vakanzen");
  redirect(`/vakanzen/${created.id}`);
}

export async function publishVacancy(vacancyId: string) {
  const staff = await requireStaff();

  if (isDemoMode()) {
    const supabase = createClient();
    const { error } = await supabase.from("vacancies").update({ status: "offen" }).eq("id", vacancyId);
    if (error) throw error;
  } else {
    await getDb()
      .update(vacancies)
      .set({ status: "offen", updatedAt: new Date() })
      .where(eq(vacancies.id, vacancyId));
  }

  await logVacancyActivity(vacancyId, "Anfrage als offene Vakanz veröffentlicht.", staff.id);
  revalidatePath("/vakanzen");
  revalidatePath(`/vakanzen/${vacancyId}`);
}

export async function mergeRequestIntoVacancy(requestVacancyId: string, targetVacancyId: string) {
  const staff = await requireStaff();

  if (isDemoMode()) {
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

    await logVacancyActivity(
      requestVacancyId,
      `Anfrage zugeordnet zu Vakanz „${target?.title}“.`,
      staff.id
    );
    await logVacancyActivity(
      targetVacancyId,
      "Zusätzliche Anfrage wurde dieser Vakanz zugeordnet.",
      staff.id,
      "notiz"
    );
  } else {
    const db = getDb();
    const [target] = await db
      .select({ title: vacancies.title })
      .from(vacancies)
      .where(eq(vacancies.id, targetVacancyId))
      .limit(1);

    await db
      .update(vacancies)
      .set({
        status: "geschlossen",
        closeReason: "sonstiges",
        closeNotes: `Zusammengeführt mit bestehender Vakanz „${target?.title ?? targetVacancyId}“.`,
        updatedAt: new Date(),
      })
      .where(eq(vacancies.id, requestVacancyId));

    await logVacancyActivity(
      requestVacancyId,
      `Anfrage zugeordnet zu Vakanz „${target?.title}“.`,
      staff.id
    );
    await logVacancyActivity(
      targetVacancyId,
      "Zusätzliche Anfrage wurde dieser Vakanz zugeordnet.",
      staff.id,
      "notiz"
    );
  }

  revalidatePath("/vakanzen");
}

export async function startProcessing(vacancyId: string) {
  const staff = await requireStaff();

  if (isDemoMode()) {
    const supabase = createClient();
    const { error } = await supabase
      .from("vacancies")
      .update({ status: "in_bearbeitung" })
      .eq("id", vacancyId);
    if (error) throw error;
  } else {
    await getDb()
      .update(vacancies)
      .set({ status: "in_bearbeitung", updatedAt: new Date() })
      .where(eq(vacancies.id, vacancyId));
  }

  await logVacancyActivity(vacancyId, "Status geändert auf „In Bearbeitung“.", staff.id);
  revalidatePath("/vakanzen");
  revalidatePath(`/vakanzen/${vacancyId}`);
}

export async function fillVacancy(
  vacancyId: string,
  candidateId: string,
  startDate: string,
  fee: number
) {
  const staff = await requireStaff();

  if (isDemoMode()) {
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

    await supabase.from("candidates").update({ status: "in_einreichung" }).eq("id", candidateId);
  } else {
    const db = getDb();
    await db
      .update(vacancies)
      .set({
        status: "besetzt",
        filledCandidateId: candidateId,
        filledStartDate: startDate,
        filledFee: String(fee),
        updatedAt: new Date(),
      })
      .where(eq(vacancies.id, vacancyId));
    await db
      .update(candidates)
      .set({ status: "in_einreichung", updatedAt: new Date() })
      .where(eq(candidates.id, candidateId));
  }

  await logVacancyActivity(vacancyId, "Vakanz erfolgreich besetzt.", staff.id);
  revalidatePath("/vakanzen");
  revalidatePath(`/vakanzen/${vacancyId}`);
}

export async function closeVacancy(
  vacancyId: string,
  reason: VacancyCloseReason,
  notes?: string
) {
  const staff = await requireStaff();

  if (isDemoMode()) {
    const supabase = createClient();
    const { error } = await supabase
      .from("vacancies")
      .update({ status: "geschlossen", close_reason: reason, close_notes: notes || null })
      .eq("id", vacancyId);
    if (error) throw error;
  } else {
    await getDb()
      .update(vacancies)
      .set({
        status: "geschlossen",
        closeReason: reason,
        closeNotes: notes || null,
        updatedAt: new Date(),
      })
      .where(eq(vacancies.id, vacancyId));
  }

  await logVacancyActivity(vacancyId, `Vakanz geschlossen (Grund: ${reason}).`, staff.id);
  revalidatePath("/vakanzen");
  revalidatePath(`/vakanzen/${vacancyId}`);
}

export async function addCandidateToMatching(
  vacancyId: string,
  candidateId: string,
  matchScore?: number
) {
  await requireStaff();

  if (isDemoMode()) {
    const supabase = createClient();
    const { error } = await supabase.from("vacancy_submissions").insert({
      vacancy_id: vacancyId,
      candidate_id: candidateId,
      match_score: matchScore ?? null,
      status: "vorgeschlagen",
    });
    if (error) throw error;
  } else {
    await getDb().insert(vacancySubmissions).values({
      vacancyId,
      candidateId,
      matchScore: matchScore != null ? String(matchScore) : null,
      status: "vorgeschlagen",
    });
  }

  revalidatePath(`/vakanzen/${vacancyId}`);
}

export async function updateSubmissionStatus(
  submissionId: string,
  vacancyId: string,
  status: string
) {
  await requireStaff();
  const nextStatus = status as SubmissionStatus;

  if (isDemoMode()) {
    const supabase = createClient();
    const { error } = await supabase
      .from("vacancy_submissions")
      .update({
        status: nextStatus,
        submitted_at: nextStatus === "angefragt" ? new Date().toISOString() : undefined,
      })
      .eq("id", submissionId);
    if (error) throw error;
  } else {
    await getDb()
      .update(vacancySubmissions)
      .set({
        status: nextStatus,
        submittedAt: nextStatus === "angefragt" ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(vacancySubmissions.id, submissionId));
  }

  revalidatePath(`/vakanzen/${vacancyId}`);
}
