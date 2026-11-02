"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CalculationResult } from "@/lib/calculator";

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
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("offers_calculations")
    .insert({
      vacancy_id: input.vacancyId || null,
      candidate_id: input.candidateId || null,
      company_id: input.companyId || null,
      created_by: user?.id ?? null,
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

export async function sendOfferForApproval(offerId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("offers_calculations")
    .update({ status: "zur_freigabe", sent_at: new Date().toISOString() })
    .eq("id", offerId);
  if (error) throw error;
  revalidatePath("/rechner");
}

export async function reviewOffer(offerId: string, approve: boolean, notes?: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("offers_calculations")
    .update({
      status: approve ? "freigegeben" : "abgelehnt",
      reviewed_by: user?.id ?? null,
      review_notes: notes || null,
    })
    .eq("id", offerId);
  if (error) throw error;

  revalidatePath("/rechner");
}

export async function logOfferSent(offerId: string, companyId: string, emailPreview: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("activity_logs").insert({
    entity_type: "company",
    entity_id: companyId,
    type: "email",
    content: `Angebot per E-Mail versendet (Anhang: anonymisiertes Profil + Angebot als PDF).`,
    created_by: user?.id ?? null,
  });

  await supabase.from("offers_calculations").update({ sent_at: new Date().toISOString() }).eq("id", offerId);

  revalidatePath("/kunden");
  revalidatePath("/rechner");
}

export async function getRecentOffers() {
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
