import { and, count, desc, eq, exists, ilike, not, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { createClient } from "@/lib/supabase/server";
import { requireCrmStaff } from "@/lib/auth/crm-access";
import { getDb } from "@/lib/db";
import {
  candidateAccounts,
  candidateDocuments,
  candidates,
  profiles,
  vacancies,
  vacancySubmissions,
} from "@/lib/db/schema";
import { demoHasOriginalCv } from "@/lib/candidate/cv-upload";
import { MISSING_DOCUMENTS_TAB } from "@/lib/candidate/recruiter-workflow";
import { isDemoMode } from "@/lib/demo/mode";
import { getDemoCandidateAccounts } from "@/lib/demo/candidate-accounts";
import { getDemoStore } from "@/lib/demo/store";
import { num, toIso, toIsoRequired } from "@/lib/db/crm";
import type { CandidateStatus } from "@/types/supabase";

export type CandidateListItem = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  anonymized_title: string | null;
  status: CandidateStatus;
  location: string | null;
  hourly_rate_net: number | null;
  availability_date: string | null;
  created_at: string;
  updated_at: string;
  last_recruiter_action_at: string | null;
  assigned_recruiter: { full_name: string } | null;
  claimed_by: { id: string; full_name: string } | null;
  claimed_at: string | null;
};

const statusOrder: CandidateStatus[] = [
  "neu_eingegangen",
  "in_bearbeitung",
  "profil_fertig",
  "in_einreichung",
  "inaktiv",
];

const assigned = alias(profiles, "assigned_recruiter");
const claimed = alias(profiles, "claimed_recruiter");

function missingDocumentsWhere() {
  return and(
    exists(
      getDb()
        .select({ id: candidateAccounts.id })
        .from(candidateAccounts)
        .where(eq(candidateAccounts.candidateId, candidates.id))
    ),
    not(
      exists(
        getDb()
          .select({ id: candidateDocuments.id })
          .from(candidateDocuments)
          .where(
            and(
              eq(candidateDocuments.candidateId, candidates.id),
              eq(candidateDocuments.kind, "cv"),
              eq(candidateDocuments.sensitivity, "original")
            )
          )
      )
    ),
    sql`${candidates.cvFilePath} is null`
  );
}

function demoMissingDocumentIds() {
  const registered = new Set(getDemoCandidateAccounts().map((account) => account.candidateId));
  return (row: Record<string, unknown>) =>
    registered.has(String(row.id)) && !row.cv_file_path && !demoHasOriginalCv(String(row.id));
}

function mapListRow(r: {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  anonymizedTitle: string | null;
  status: CandidateStatus;
  location: string | null;
  hourlyRateNet: string | number | null;
  availabilityDate: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastRecruiterActionAt: Date | string | null;
  recruiterName: string | null;
  claimedById: string | null;
  claimedByName: string | null;
  claimedAt: Date | string | null;
}): CandidateListItem {
  return {
    id: r.id,
    first_name: r.firstName,
    last_name: r.lastName,
    email: r.email,
    anonymized_title: r.anonymizedTitle,
    status: r.status,
    location: r.location,
    hourly_rate_net: num(r.hourlyRateNet),
    availability_date: r.availabilityDate,
    created_at: toIsoRequired(r.createdAt),
    updated_at: toIsoRequired(r.updatedAt),
    last_recruiter_action_at: toIso(r.lastRecruiterActionAt),
    assigned_recruiter: r.recruiterName ? { full_name: r.recruiterName } : null,
    claimed_by: r.claimedById && r.claimedByName ? { id: r.claimedById, full_name: r.claimedByName } : null,
    claimed_at: toIso(r.claimedAt),
  };
}

export async function getCandidateTabCounts() {
  await requireCrmStaff();
  if (isDemoMode()) {
    const supabase = createClient();
    const counts = await Promise.all(
      statusOrder.map((status) =>
        supabase.from("candidates").select("id", { count: "exact", head: true }).eq("status", status)
      )
    );
    const { data } = await supabase
      .from("candidates")
      .select("id, cv_file_path");
    const missingDocuments = ((data ?? []) as { id: string; cv_file_path: string | null }[]).filter(
      demoMissingDocumentIds()
    ).length;
    const total = counts.reduce((sum, result) => sum + (result.count ?? 0), 0);
    return {
      alle: total,
      neu_eingegangen: counts[0].count ?? 0,
      in_bearbeitung: counts[1].count ?? 0,
      profil_fertig: counts[2].count ?? 0,
      in_einreichung: counts[3].count ?? 0,
      inaktiv: counts[4].count ?? 0,
      [MISSING_DOCUMENTS_TAB]: missingDocuments,
    };
  }

  const db = getDb();
  const [rows, [missing]] = await Promise.all([
    db.select({ status: candidates.status, n: count() }).from(candidates).groupBy(candidates.status),
    db.select({ n: count() }).from(candidates).where(missingDocumentsWhere()),
  ]);

  const byStatus = Object.fromEntries(rows.map((r) => [r.status, Number(r.n)])) as Record<string, number>;
  const total = rows.reduce((sum, r) => sum + Number(r.n), 0);
  return {
    alle: total,
    neu_eingegangen: byStatus.neu_eingegangen ?? 0,
    in_bearbeitung: byStatus.in_bearbeitung ?? 0,
    profil_fertig: byStatus.profil_fertig ?? 0,
    in_einreichung: byStatus.in_einreichung ?? 0,
    inaktiv: byStatus.inaktiv ?? 0,
    [MISSING_DOCUMENTS_TAB]: Number(missing?.n ?? 0),
  };
}

export async function getCandidates(tab: string, search?: string) {
  await requireCrmStaff();
  if (isDemoMode()) {
    const supabase = createClient();
    let query = supabase
      .from("candidates")
      .select(
        "id, first_name, last_name, email, anonymized_title, status, location, hourly_rate_net, availability_date, created_at, updated_at, last_recruiter_action_at, claimed_by_profile_id, claimed_at, cv_file_path, assigned_recruiter:profiles(full_name)"
      )
      .order("updated_at", { ascending: false });
    if (tab !== "alle" && tab !== MISSING_DOCUMENTS_TAB) query = query.eq("status", tab as CandidateStatus);
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,anonymized_title.ilike.%${search}%,email.ilike.%${search}%`
      );
    }
    const { data, error } = await query;
    if (error) throw error;
    const profilesById = new Map(
      getDemoStore().profiles.map((profile) => [String(profile.id), profile as { id: string; full_name: string }])
    );
    let rows = (data ?? []) as unknown as Array<
      CandidateListItem & {
        cv_file_path?: string | null;
        claimed_by_profile_id?: string | null;
      }
    >;
    if (tab === MISSING_DOCUMENTS_TAB) {
      rows = rows.filter((row) => demoMissingDocumentIds()(row as unknown as Record<string, unknown>));
    }
    return rows.map((row) => {
      const claimed = row.claimed_by_profile_id ? profilesById.get(row.claimed_by_profile_id) : null;
      return {
        id: row.id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email ?? null,
        anonymized_title: row.anonymized_title,
        status: row.status,
        location: row.location,
        hourly_rate_net: row.hourly_rate_net,
        availability_date: row.availability_date,
        created_at: row.created_at,
        updated_at: row.updated_at,
        last_recruiter_action_at: row.last_recruiter_action_at ?? null,
        assigned_recruiter: row.assigned_recruiter,
        claimed_by: claimed ? { id: claimed.id, full_name: claimed.full_name } : null,
        claimed_at: row.claimed_at ?? null,
      };
    });
  }

  const db = getDb();
  const filters = [];
  if (tab === MISSING_DOCUMENTS_TAB) {
    filters.push(missingDocumentsWhere());
  } else if (tab !== "alle") {
    filters.push(eq(candidates.status, tab as CandidateStatus));
  }
  if (search?.trim()) {
    const q = `%${search.trim()}%`;
    filters.push(
      or(
        ilike(candidates.firstName, q),
        ilike(candidates.lastName, q),
        ilike(candidates.anonymizedTitle, q),
        ilike(candidates.email, q)
      )!
    );
  }

  const rows = await db
    .select({
      id: candidates.id,
      firstName: candidates.firstName,
      lastName: candidates.lastName,
      email: candidates.email,
      anonymizedTitle: candidates.anonymizedTitle,
      status: candidates.status,
      location: candidates.location,
      hourlyRateNet: candidates.hourlyRateNet,
      availabilityDate: candidates.availabilityDate,
      createdAt: candidates.createdAt,
      updatedAt: candidates.updatedAt,
      lastRecruiterActionAt: candidates.lastRecruiterActionAt,
      recruiterName: assigned.fullName,
      claimedById: claimed.id,
      claimedByName: claimed.fullName,
      claimedAt: candidates.claimedAt,
    })
    .from(candidates)
    .leftJoin(assigned, eq(assigned.id, candidates.assignedRecruiterId))
    .leftJoin(claimed, eq(claimed.id, candidates.claimedByProfileId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(candidates.updatedAt));

  return rows.map(mapListRow);
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
    const claimedId = (data as { claimed_by_profile_id?: string | null }).claimed_by_profile_id;
    const claimedProfile = claimedId
      ? (getDemoStore().profiles.find((profile) => profile.id === claimedId) as
          | { id: string; full_name: string }
          | undefined)
      : null;
    return {
      ...data,
      claimed_by: claimedProfile ? { id: claimedProfile.id, full_name: claimedProfile.full_name } : null,
    };
  }

  const db = getDb();
  const [row] = await db
    .select({
      candidate: candidates,
      recruiterId: assigned.id,
      recruiterName: assigned.fullName,
      claimedById: claimed.id,
      claimedByName: claimed.fullName,
    })
    .from(candidates)
    .leftJoin(assigned, eq(assigned.id, candidates.assignedRecruiterId))
    .leftJoin(claimed, eq(claimed.id, candidates.claimedByProfileId))
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
    last_recruiter_action_at: toIso(c.lastRecruiterActionAt),
    claimed_by_profile_id: c.claimedByProfileId,
    claimed_at: toIso(c.claimedAt),
    created_at: toIsoRequired(c.createdAt),
    updated_at: toIsoRequired(c.updatedAt),
    assigned_recruiter: row.recruiterId
      ? { id: row.recruiterId, full_name: row.recruiterName }
      : null,
    claimed_by: row.claimedById && row.claimedByName ? { id: row.claimedById, full_name: row.claimedByName } : null,
    submissions: submissions.map((s) => ({
      id: s.id,
      status: s.status,
      match_score: num(s.matchScore),
      vacancy: s.vacancyId ? { id: s.vacancyId, title: s.vacancyTitle } : null,
    })),
  };
}
