import { desc, eq, isNotNull } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { requireCrmStaff } from "@/lib/auth/crm-access";
import { getDb } from "@/lib/db";
import { candidates, companies, contracts, vacancies } from "@/lib/db/schema";
import { isDemoMode } from "@/lib/demo/mode";
import { num, toIsoRequired } from "@/lib/db/crm";

export async function getContracts() {
  await requireCrmStaff();
  if (isDemoMode()) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("contracts")
      .select(
        `id, contract_number, status, start_date, end_date, hourly_rate, fee, currency, created_at,
       company:companies(id, name),
       candidate:candidates(id, first_name, last_name),
       vacancy:vacancies(id, title)`
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  const db = getDb();
  const rows = await db
    .select({
      contract: contracts,
      companyId: companies.id,
      companyName: companies.name,
      candidateId: candidates.id,
      candidateFirst: candidates.firstName,
      candidateLast: candidates.lastName,
      vacancyId: vacancies.id,
      vacancyTitle: vacancies.title,
    })
    .from(contracts)
    .leftJoin(companies, eq(companies.id, contracts.companyId))
    .leftJoin(candidates, eq(candidates.id, contracts.candidateId))
    .leftJoin(vacancies, eq(vacancies.id, contracts.vacancyId))
    .orderBy(desc(contracts.createdAt));

  return rows.map((r) => {
    const c = r.contract;
    return {
      id: c.id,
      contract_number: c.contractNumber,
      status: c.status,
      start_date: c.startDate,
      end_date: c.endDate,
      hourly_rate: num(c.hourlyRate),
      fee: num(c.fee),
      currency: c.currency,
      created_at: toIsoRequired(c.createdAt),
      company: r.companyId ? { id: r.companyId, name: r.companyName } : null,
      candidate: r.candidateId
        ? { id: r.candidateId, first_name: r.candidateFirst, last_name: r.candidateLast }
        : null,
      vacancy: r.vacancyId ? { id: r.vacancyId, title: r.vacancyTitle } : null,
    };
  });
}

export async function getFillableVacancies() {
  await requireCrmStaff();
  if (isDemoMode()) {
    const supabase = createClient();
    const { data: filled, error } = await supabase
      .from("vacancies")
      .select(
        `id, title, filled_start_date, filled_fee, currency, company_id,
       company:companies(id, name),
       filled_candidate:candidates!vacancies_filled_candidate_id_fkey(id, first_name, last_name)`
      )
      .eq("status", "besetzt");
    if (error) throw error;
    const { data: existingContracts } = await supabase.from("contracts").select("vacancy_id");
    const contractedIds = new Set(
      (existingContracts ?? []).map((c: { vacancy_id: string | null }) => c.vacancy_id)
    );
    return (filled ?? []).filter((v: { id: string }) => !contractedIds.has(v.id));
  }

  const db = getDb();
  const existing = await db
    .select({ vacancyId: contracts.vacancyId })
    .from(contracts)
    .where(isNotNull(contracts.vacancyId));
  const contractedIds = new Set(existing.map((e) => e.vacancyId).filter(Boolean) as string[]);

  const rows = await db
    .select({
      vacancy: vacancies,
      companyId: companies.id,
      companyName: companies.name,
      filledId: candidates.id,
      filledFirst: candidates.firstName,
      filledLast: candidates.lastName,
    })
    .from(vacancies)
    .leftJoin(companies, eq(companies.id, vacancies.companyId))
    .leftJoin(candidates, eq(candidates.id, vacancies.filledCandidateId))
    .where(eq(vacancies.status, "besetzt"));

  return rows
    .filter((r) => !contractedIds.has(r.vacancy.id))
    .map((r) => ({
      id: r.vacancy.id,
      title: r.vacancy.title,
      filled_start_date: r.vacancy.filledStartDate,
      filled_fee: num(r.vacancy.filledFee),
      currency: r.vacancy.currency,
      company_id: r.vacancy.companyId,
      company: r.companyId ? { id: r.companyId, name: r.companyName } : null,
      filled_candidate: r.filledId
        ? { id: r.filledId, first_name: r.filledFirst, last_name: r.filledLast }
        : null,
    }));
}
