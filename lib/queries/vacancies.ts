import { and, count, desc, eq, inArray, ne, notInArray } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { requireCrmStaff } from "@/lib/auth/crm-access";
import { getDb } from "@/lib/db";
import {
  candidates,
  companies,
  contacts,
  profiles,
  vacancies,
  vacancySubmissions,
} from "@/lib/db/schema";
import { isDemoMode } from "@/lib/demo/mode";
import { num, toIso, toIsoRequired } from "@/lib/db/crm";
import type { VacancyStatus } from "@/types/supabase";

const statusOrder: VacancyStatus[] = [
  "neue_anfrage",
  "offen",
  "in_bearbeitung",
  "besetzt",
  "geschlossen",
];

export async function getVacancyTabCounts() {
  await requireCrmStaff();
  if (isDemoMode()) {
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

  const db = getDb();
  const rows = await db
    .select({ status: vacancies.status, n: count() })
    .from(vacancies)
    .groupBy(vacancies.status);
  const byStatus = Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
  return {
    neue_anfrage: byStatus.neue_anfrage ?? 0,
    offen: byStatus.offen ?? 0,
    in_bearbeitung: byStatus.in_bearbeitung ?? 0,
    besetzt: byStatus.besetzt ?? 0,
    geschlossen: byStatus.geschlossen ?? 0,
  };
}

export async function getVacancies(tab: VacancyStatus) {
  await requireCrmStaff();
  if (isDemoMode()) {
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

  const db = getDb();
  const rows = await db
    .select({
      vacancy: vacancies,
      companyId: companies.id,
      companyName: companies.name,
      filledId: candidates.id,
      filledFirst: candidates.firstName,
      filledLast: candidates.lastName,
      recruiterId: profiles.id,
      recruiterName: profiles.fullName,
    })
    .from(vacancies)
    .leftJoin(companies, eq(companies.id, vacancies.companyId))
    .leftJoin(candidates, eq(candidates.id, vacancies.filledCandidateId))
    .leftJoin(profiles, eq(profiles.id, vacancies.assignedRecruiterId))
    .where(eq(vacancies.status, tab))
    .orderBy(desc(vacancies.updatedAt));

  const ids = rows.map((r) => r.vacancy.id);
  const submissionRows =
    ids.length === 0
      ? []
      : await db
          .select({ id: vacancySubmissions.id, vacancyId: vacancySubmissions.vacancyId })
          .from(vacancySubmissions)
          .where(inArray(vacancySubmissions.vacancyId, ids));

  return rows.map((r) => {
    const v = r.vacancy;
    return {
      id: v.id,
      title: v.title,
      source: v.source,
      status: v.status,
      employment_type: v.employmentType,
      budget_min: num(v.budgetMin),
      budget_max: num(v.budgetMax),
      currency: v.currency,
      location: v.location,
      filled_start_date: v.filledStartDate,
      filled_fee: num(v.filledFee),
      close_reason: v.closeReason,
      created_at: toIsoRequired(v.createdAt),
      updated_at: toIsoRequired(v.updatedAt),
      company: r.companyId ? { id: r.companyId, name: r.companyName } : null,
      filled_candidate: r.filledId
        ? { id: r.filledId, first_name: r.filledFirst, last_name: r.filledLast }
        : null,
      assigned_recruiter: r.recruiterId
        ? { id: r.recruiterId, full_name: r.recruiterName }
        : null,
      submissions: submissionRows.filter((s) => s.vacancyId === v.id).map((s) => ({ id: s.id })),
    };
  });
}

export async function getVacancyById(id: string) {
  await requireCrmStaff();
  if (isDemoMode()) {
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

  const db = getDb();
  const [row] = await db
    .select({
      vacancy: vacancies,
      company: companies,
      contact: contacts,
      recruiterId: profiles.id,
      recruiterName: profiles.fullName,
    })
    .from(vacancies)
    .leftJoin(companies, eq(companies.id, vacancies.companyId))
    .leftJoin(contacts, eq(contacts.id, vacancies.contactId))
    .leftJoin(profiles, eq(profiles.id, vacancies.assignedRecruiterId))
    .where(eq(vacancies.id, id))
    .limit(1);

  if (!row) throw new Error("Vakanz nicht gefunden.");

  const filled = row.vacancy.filledCandidateId
    ? await db
        .select({
          id: candidates.id,
          firstName: candidates.firstName,
          lastName: candidates.lastName,
        })
        .from(candidates)
        .where(eq(candidates.id, row.vacancy.filledCandidateId))
        .limit(1)
    : [];

  const submissionRows = await db
    .select({
      submission: vacancySubmissions,
      candidate: candidates,
    })
    .from(vacancySubmissions)
    .innerJoin(candidates, eq(candidates.id, vacancySubmissions.candidateId))
    .where(eq(vacancySubmissions.vacancyId, id));

  const v = row.vacancy;
  return {
    id: v.id,
    company_id: v.companyId,
    contact_id: v.contactId,
    title: v.title,
    source: v.source,
    status: v.status,
    employment_type: v.employmentType,
    requirements: v.requirements,
    budget_min: num(v.budgetMin),
    budget_max: num(v.budgetMax),
    currency: v.currency,
    location: v.location,
    start_date: v.startDate,
    assigned_recruiter_id: v.assignedRecruiterId,
    filled_candidate_id: v.filledCandidateId,
    filled_start_date: v.filledStartDate,
    filled_fee: num(v.filledFee),
    close_reason: v.closeReason,
    close_notes: v.closeNotes,
    created_at: toIsoRequired(v.createdAt),
    updated_at: toIsoRequired(v.updatedAt),
    company: row.company
      ? {
          id: row.company.id,
          name: row.company.name,
          industry: row.company.industry,
          city: row.company.city,
        }
      : null,
    contact: row.contact
      ? {
          id: row.contact.id,
          first_name: row.contact.firstName,
          last_name: row.contact.lastName,
          email: row.contact.email,
          phone: row.contact.phone,
        }
      : null,
    assigned_recruiter: row.recruiterId
      ? { id: row.recruiterId, full_name: row.recruiterName }
      : null,
    filled_candidate: filled[0]
      ? {
          id: filled[0].id,
          first_name: filled[0].firstName,
          last_name: filled[0].lastName,
        }
      : null,
    submissions: submissionRows.map(({ submission: s, candidate: c }) => ({
      id: s.id,
      match_score: num(s.matchScore),
      status: s.status,
      submitted_at: toIso(s.submittedAt),
      feedback: s.feedback,
      candidate: {
        id: c.id,
        first_name: c.firstName,
        last_name: c.lastName,
        anonymized_title: c.anonymizedTitle,
        status: c.status,
        hourly_rate_net: num(c.hourlyRateNet),
        location: c.location,
      },
    })),
  };
}

export async function getOpenVacanciesForCompany(companyId: string, excludeId?: string) {
  await requireCrmStaff();
  if (isDemoMode()) {
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

  const db = getDb();
  const filters = [
    eq(vacancies.companyId, companyId),
    inArray(vacancies.status, ["offen", "in_bearbeitung"]),
  ];
  if (excludeId) filters.push(ne(vacancies.id, excludeId));
  return db
    .select({ id: vacancies.id, title: vacancies.title, status: vacancies.status })
    .from(vacancies)
    .where(and(...filters));
}

export async function getCandidatesForMatching(excludeIds: string[]) {
  await requireCrmStaff();
  if (isDemoMode()) {
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

  const db = getDb();
  const filters = [ne(candidates.status, "inaktiv")];
  if (excludeIds.length > 0) filters.push(notInArray(candidates.id, excludeIds));
  const rows = await db
    .select({
      id: candidates.id,
      firstName: candidates.firstName,
      lastName: candidates.lastName,
      anonymizedTitle: candidates.anonymizedTitle,
      status: candidates.status,
      hourlyRateNet: candidates.hourlyRateNet,
      location: candidates.location,
    })
    .from(candidates)
    .where(and(...filters))
    .orderBy(desc(candidates.updatedAt))
    .limit(50);

  return rows.map((r) => ({
    id: r.id,
    first_name: r.firstName,
    last_name: r.lastName,
    anonymized_title: r.anonymizedTitle,
    status: r.status,
    hourly_rate_net: num(r.hourlyRateNet),
    location: r.location,
  }));
}
