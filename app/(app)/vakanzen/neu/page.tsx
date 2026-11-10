import { asc, inArray } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { companies, contacts } from "@/lib/db/schema";
import { isDemoMode } from "@/lib/demo/mode";
import { VacancyFormWizard } from "@/components/vakanzen/vacancy-form-wizard";

async function getCompaniesWithContacts() {
  if (isDemoMode()) {
    const supabase = createClient();
    const { data } = await supabase
      .from("companies")
      .select("id, name, contacts(id, first_name, last_name)")
      .order("name");
    return data ?? [];
  }

  const db = getDb();
  const companyRows = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .orderBy(asc(companies.name));

  if (companyRows.length === 0) return [];

  const contactRows = await db
    .select({
      id: contacts.id,
      companyId: contacts.companyId,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
    })
    .from(contacts)
    .where(
      inArray(
        contacts.companyId,
        companyRows.map((c) => c.id)
      )
    );

  return companyRows.map((c) => ({
    id: c.id,
    name: c.name,
    contacts: contactRows
      .filter((ct) => ct.companyId === c.id)
      .map((ct) => ({
        id: ct.id,
        first_name: ct.firstName,
        last_name: ct.lastName,
      })),
  }));
}

export default async function NewVacancyPage() {
  const companyOptions = await getCompaniesWithContacts();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Vakanz anlegen</h1>
        <p className="text-sm text-ink-muted">
          Erfasse eine neue Vakanz in vier Schritten.
        </p>
      </div>
      <VacancyFormWizard companies={companyOptions} />
    </div>
  );
}
