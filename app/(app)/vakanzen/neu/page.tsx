import { createClient } from "@/lib/supabase/server";
import { VacancyFormWizard } from "@/components/vakanzen/vacancy-form-wizard";

export default async function NewVacancyPage() {
  const supabase = createClient();
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, contacts(id, first_name, last_name)")
    .order("name");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Vakanz anlegen</h1>
        <p className="text-sm text-ink-muted">
          Erfasse eine neue Vakanz in vier Schritten.
        </p>
      </div>
      <VacancyFormWizard companies={companies ?? []} />
    </div>
  );
}
