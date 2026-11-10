import { and, count, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { requireCrmStaff } from "@/lib/auth/crm-access";
import { getDb } from "@/lib/db";
import { candidates, profiles, vacancies, vacancySubmissions } from "@/lib/db/schema";
import { isDemoMode } from "@/lib/demo/mode";
import { num, toIsoRequired } from "@/lib/db/crm";
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
  await requireCrmStaff();
  if (isDemoMode()) {
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

  const db = getDb();
  const rows = await db
    .select({ status: candidates.status, n: count() })
    .from(candidates)
    .groupBy(candidates.status);

  const byStatus = Object.fromEntries(rows.map((r) => [r.status, Number(r.n)])) as Record<
    string,
    number
  >;
  const total = rows.reduce((sum, r) => sum + Number(r.n), 0);
  return {
    alle: total,
    neu_eingegangen: byStatus.neu_eingegangen ?? 0,
    in_bearbeitung: byStatus.in_bearbeitung ?? 0,
    profil_fertig: byStatus.profil_fertig ?? 0,
    in_einreichung: byStatus.in_einreichung ?? 0,
    inaktiv: byStatus.inaktiv ?? 0,
  };
}

export async function getCandidates(tab: string, search?: string) {
  await requireCrmStaff();
  if (isDemoMode()) {
    const supabase = createClient();
    let query = supabase
      .from("candidates")
      .select(
        "id, first_name, last_name, anonymized_title, status, location, hourly_rate_net, availability_date, updated_at, assigned_recruiter:profiles(full_name)"
      )
      .order("updated_at", { ascending: false });
    if (tab !== "alle") query = query.eq("status", tab as CandidateStatus);
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,anonymized_title.ilike.%${search}%`
      );
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as unknown as CandidateListItem[];
  }

  const db = getDb();
  const filters = [];
  if (tab !== "alle") filters.push(eq(candidates.status, tab as CandidateStatus));
  if (search?.trim()) {
    const q = `%${search.trim()}%`;
    filters.push(
      or(
        ilike(candidates.firstName, q),
        ilike(candidates.lastName, q),
        ilike(candidates.anonymizedTitle, q)
      )!
    );
  }

  const rows = await db
    .select({
      id: candidates.id,
      firstName: candidates.firstName,
      lastName: candidates.lastName,
      anonymizedTitle: candidates.anonymizedTitle,
      status: candidates.status,
      location: candidates.location,
      hourlyRateNet: candidates.hourlyRateNet,
      availabilityDate: candidates.availabilityDate,
      updatedAt: candidates.updatedAt,
      recruiterName: profiles.fullName,
    })
    .from(candidates)
    .leftJoin(profiles, eq(profiles.id, candidates.assignedRecruiterId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(candidates.updatedAt));

  return rows.map(
    (r): CandidateListItem => ({
      id: r.id,
      first_name: r.firstName,
      last_name: r.lastName,
      anonymized_title: r.anonymizedTitle,
      status: r.status,
      location: r.location,
      hourly_rate_net: num(r.hourlyRateNet),
      availability_date: r.availabilityDate,
      updated_at: toIsoRequired(r.updatedAt),
      assigned_recruiter: r.recruiterName ? { full_name: r.recruiterName } : null,
    })
  );
}

export async function getCandidateById(id: string) {
  await requireCrmStaff();
  if (isDemoMode()) {
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

  const db = getDb();
  const [row] = await db
    .select({
      candidate: candidates,
      recruiterId: profiles.id,
      recruiterName: profiles.fullName,
    })
    .from(candidates)
    .leftJoin(profiles, eq(profiles.id, candidates.assignedRecruiterId))
    .where(eq(candidates.id, id))
    .limit(1);

  if (!row) throw new Error("Kandidat nicht gefunden.");

  const submissions = await db
    .select({
      id: vacancySubmissions.id,
      status: vacancySubmissions.status,
      matchScore: vacancySubmissions.matchScore,
      vacancyId: vacancies.id,
      vacancyTitle: vacancies.title,
    })
    .from(vacancySubmissions)
    .leftJoin(vacancies, eq(vacancies.id, vacancySubmissions.vacancyId))
    .where(eq(vacancySubmissions.candidateId, id));

  const c = row.candidate;
  return {
    id: c.id,
    first_name: c.firstName,
    last_name: c.lastName,
    email: c.email,
    phone: c.phone,
    anonymized_title: c.anonymizedTitle,
    anonymized_profile: c.anonymizedProfile,
    status: c.status,
    desired_salary_min: num(c.desiredSalaryMin),
    desired_salary_max: num(c.desiredSalaryMax),
    hourly_rate_net: num(c.hourlyRateNet),
    availability_date: c.availabilityDate,
    location: c.location,
    assigned_recruiter_id: c.assignedRecruiterId,
    cv_file_path: c.cvFilePath,
    exposé_file_path: c.exposeFilePath,
    created_at: toIsoRequired(c.createdAt),
    updated_at: toIsoRequired(c.updatedAt),
    assigned_recruiter: row.recruiterId
      ? { id: row.recruiterId, full_name: row.recruiterName }
      : null,
    submissions: submissions.map((s) => ({
      id: s.id,
      status: s.status,
      match_score: num(s.matchScore),
      vacancy: s.vacancyId ? { id: s.vacancyId, title: s.vacancyTitle } : null,
    })),
  };
}
