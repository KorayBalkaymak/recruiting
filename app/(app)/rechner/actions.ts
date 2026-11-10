"use server";

import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { candidates, companies, offersCalculations, vacancies } from "@/lib/db/schema";
import { insertActivityLog, num, toIsoRequired } from "@/lib/db/crm";
import { isDemoMode } from "@/lib/demo/mode";
import type { CalculationResult } from "@/lib/calculator";
import { requireOfferReviewer, requireStaff } from "@/lib/auth";
import { assertOfferReviewerActor } from "@/lib/auth/actor-binding";

export async function saveOfferCalculation(input: {
  mode: "stundensatz" | "gehalt";
  vacancyId?: string;
  candidateId?: string;
  companyId?: string;
  candidateHourlyRateNet?: number;
  candidateMonthlySalary?: number;
  currency: string;
  assignmentDurationMonths?: number;
  assignmentLocation?: string;
  factorTier: "basis" | "standard" | "spezialist" | "premium";
  factorValue: number;
  result: CalculationResult;
}) {
  const staff = await requireStaff();

  if (isDemoMode()) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("offers_calculations")
      .insert({
        vacancy_id: input.vacancyId || null,
        candidate_id: input.candidateId || null,
        company_id: input.companyId || null,
        created_by: staff.id,
        mode: input.mode,
        candidate_hourly_rate_net: input.candidateHourlyRateNet ?? null,
        candidate_monthly_salary: input.candidateMonthlySalary ?? null,
        currency: input.currency,
        assignment_duration_months: input.assignmentDurationMonths ?? null,
        assignment_location: input.assignmentLocation ?? null,
        factor_tier: input.factorTier,
        factor_value: input.factorValue,
        recommended_hourly_rate: input.result.recommendedHourlyRate,
        monthly_revenue: input.result.monthlyRevenue,
        margin_per_hour: input.result.marginPerHour,
        margin_per_month: input.result.marginPerMonth,
        margin_per_year: input.result.marginPerYear,
        status: "entwurf",
      })
      .select("id")
      .single();
    if (error) throw error;
    revalidatePath("/rechner");
    return data.id as string;
  }

  const [created] = await getDb()
    .insert(offersCalculations)
    .values({
      vacancyId: input.vacancyId || null,
      candidateId: input.candidateId || null,
      companyId: input.companyId || null,
      createdBy: staff.id,
      mode: input.mode,
      candidateHourlyRateNet:
        input.candidateHourlyRateNet != null ? String(input.candidateHourlyRateNet) : null,
      candidateMonthlySalary:
        input.candidateMonthlySalary != null ? String(input.candidateMonthlySalary) : null,
      currency: input.currency,
      assignmentDurationMonths: input.assignmentDurationMonths ?? null,
      assignmentLocation: input.assignmentLocation ?? null,
      factorTier: input.factorTier,
      factorValue: String(input.factorValue),
      recommendedHourlyRate: String(input.result.recommendedHourlyRate),
      monthlyRevenue: String(input.result.monthlyRevenue),
      marginPerHour: String(input.result.marginPerHour),
      marginPerMonth: String(input.result.marginPerMonth),
      marginPerYear: String(input.result.marginPerYear),
      status: "entwurf",
    })
    .returning({ id: offersCalculations.id });

  revalidatePath("/rechner");
  return created.id;
}

export async function sendOfferForApproval(offerId: string) {
  await requireStaff();

  if (isDemoMode()) {
    const supabase = createClient();
    const { error } = await supabase
      .from("offers_calculations")
      .update({ status: "zur_freigabe", sent_at: new Date().toISOString() })
      .eq("id", offerId);
    if (error) throw error;
  } else {
    await getDb()
      .update(offersCalculations)
      .set({ status: "zur_freigabe", sentAt: new Date(), updatedAt: new Date() })
      .where(eq(offersCalculations.id, offerId));
  }

  revalidatePath("/rechner");
}

export async function reviewOffer(offerId: string, approve: boolean, notes?: string) {
  const reviewer = assertOfferReviewerActor(await requireOfferReviewer());

  if (isDemoMode()) {
    const supabase = createClient();
    const { error } = await supabase
      .from("offers_calculations")
      .update({
        status: approve ? "freigegeben" : "abgelehnt",
        reviewed_by: reviewer.id,
        review_notes: notes || null,
      })
      .eq("id", offerId);
    if (error) throw error;
  } else {
    await getDb()
      .update(offersCalculations)
      .set({
        status: approve ? "freigegeben" : "abgelehnt",
        reviewedBy: reviewer.id,
        reviewNotes: notes || null,
        updatedAt: new Date(),
      })
      .where(eq(offersCalculations.id, offerId));
  }

  revalidatePath("/rechner");
}

export async function logOfferSent(offerId: string, companyId: string, _emailPreview: string) {
  const staff = await requireStaff();

  if (isDemoMode()) {
    const supabase = createClient();
    await supabase.from("activity_logs").insert({
      entity_type: "company",
      entity_id: companyId,
      type: "email",
      content: `Angebot per E-Mail versendet (Anhang: anonymisiertes Profil + Angebot als PDF).`,
      created_by: staff.id,
    });
    await supabase
      .from("offers_calculations")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", offerId);
  } else {
    await insertActivityLog({
      entityType: "company",
      entityId: companyId,
      type: "email",
      content: `Angebot per E-Mail versendet (Anhang: anonymisiertes Profil + Angebot als PDF).`,
      createdBy: staff.id,
    });
    await getDb()
      .update(offersCalculations)
      .set({ sentAt: new Date(), updatedAt: new Date() })
      .where(eq(offersCalculations.id, offerId));
  }

  revalidatePath("/kunden");
  revalidatePath("/rechner");
}

export async function getRecentOffers() {
  await requireStaff();

  if (isDemoMode()) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("offers_calculations")
      .select(
        `id, mode, currency, recommended_hourly_rate, monthly_revenue, margin_per_month, status, created_at,
       company:companies(id, name), candidate:candidates(id, first_name, last_name), vacancy:vacancies(id, title)`
      )
      .order("created_at", { ascending: false })
      .limit(15);
    if (error) throw error;
    return data ?? [];
  }

  const rows = await getDb()
    .select({
      offer: offersCalculations,
      companyId: companies.id,
      companyName: companies.name,
      candidateId: candidates.id,
      candidateFirst: candidates.firstName,
      candidateLast: candidates.lastName,
      vacancyId: vacancies.id,
      vacancyTitle: vacancies.title,
    })
    .from(offersCalculations)
    .leftJoin(companies, eq(companies.id, offersCalculations.companyId))
    .leftJoin(candidates, eq(candidates.id, offersCalculations.candidateId))
    .leftJoin(vacancies, eq(vacancies.id, offersCalculations.vacancyId))
    .orderBy(desc(offersCalculations.createdAt))
    .limit(15);

  return rows.map((r) => {
    const o = r.offer;
    return {
      id: o.id,
      mode: o.mode,
      currency: o.currency,
      recommended_hourly_rate: num(o.recommendedHourlyRate),
      monthly_revenue: num(o.monthlyRevenue),
      margin_per_month: num(o.marginPerMonth),
      status: o.status,
      created_at: toIsoRequired(o.createdAt),
      company: r.companyId ? { id: r.companyId, name: r.companyName } : null,
      candidate: r.candidateId
        ? { id: r.candidateId, first_name: r.candidateFirst, last_name: r.candidateLast }
        : null,
      vacancy: r.vacancyId ? { id: r.vacancyId, title: r.vacancyTitle } : null,
    };
  });
}
