import Link from "next/link";
import { FileText, Download, Eye } from "lucide-react";
import { desc, eq, isNotNull } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { candidates, companies, contracts, offersCalculations } from "@/lib/db/schema";
import { num, toIsoRequired } from "@/lib/db/crm";
import { isDemoMode } from "@/lib/demo/mode";
import { formatCurrency, formatDate } from "@/lib/utils";

async function getUnterlagenData() {
  if (isDemoMode()) {
    const supabase = createClient();
    const [{ data: candidateRows }, { data: offerRows }, { data: contractRows }] = await Promise.all([
      supabase
        .from("candidates")
        .select("id, first_name, last_name, anonymized_title, updated_at")
        .not("anonymized_title", "is", null)
        .order("updated_at", { ascending: false }),
      supabase
        .from("offers_calculations")
        .select("id, currency, recommended_hourly_rate, status, created_at, company:companies(name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("contracts")
        .select("id, contract_number, status, currency, fee, created_at, company:companies(name)")
        .order("created_at", { ascending: false }),
    ]);
    return {
      candidates: candidateRows ?? [],
      offers: offerRows ?? [],
      contracts: contractRows ?? [],
    };
  }

  const db = getDb();
  const [candidateRows, offerRows, contractRows] = await Promise.all([
    db
      .select({
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        anonymizedTitle: candidates.anonymizedTitle,
        updatedAt: candidates.updatedAt,
      })
      .from(candidates)
      .where(isNotNull(candidates.anonymizedTitle))
      .orderBy(desc(candidates.updatedAt)),
    db
      .select({
        offer: offersCalculations,
        companyName: companies.name,
      })
      .from(offersCalculations)
      .leftJoin(companies, eq(companies.id, offersCalculations.companyId))
      .orderBy(desc(offersCalculations.createdAt)),
    db
      .select({
        contract: contracts,
        companyName: companies.name,
      })
      .from(contracts)
      .leftJoin(companies, eq(companies.id, contracts.companyId))
      .orderBy(desc(contracts.createdAt)),
  ]);

  return {
    candidates: candidateRows.map((c) => ({
      id: c.id,
      first_name: c.firstName,
      last_name: c.lastName,
      anonymized_title: c.anonymizedTitle,
      updated_at: toIsoRequired(c.updatedAt),
    })),
    offers: offerRows.map(({ offer: o, companyName }) => ({
      id: o.id,
      currency: o.currency,
      recommended_hourly_rate: num(o.recommendedHourlyRate),
      status: o.status,
      created_at: toIsoRequired(o.createdAt),
      company: { name: companyName },
    })),
    contracts: contractRows.map(({ contract: c, companyName }) => ({
      id: c.id,
      contract_number: c.contractNumber,
      status: c.status,
      currency: c.currency,
      fee: num(c.fee),
      created_at: toIsoRequired(c.createdAt),
      company: { name: companyName },
    })),
  };
}

export default async function UnterlagenPage() {
  const { candidates: candidateDocs, offers, contracts: contractDocs } = await getUnterlagenData();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Unterlagen</h1>
        <p className="text-sm text-ink-muted">
          Zentrale Ablage aller automatisch erzeugten Dokumente.
        </p>
      </div>

      <DocumentSection
        title="Anonymisierte Kandidaten-Exposés"
        emptyLabel="Noch keine Exposés erstellt."
        rows={candidateDocs.map(
          (c: {
            id: string;
            anonymized_title: string | null;
            first_name: string;
            last_name: string;
            updated_at: string;
          }) => ({
            id: c.id,
            primary: c.anonymized_title ?? `${c.first_name} ${c.last_name}`,
            secondary: formatDate(c.updated_at),
            viewHref: `/kandidaten/${c.id}/pdf`,
            downloadHref: `/kandidaten/${c.id}/pdf?download=1`,
          })
        )}
      />

      <DocumentSection
        title="Angebote (Verrechnungssatzrechner)"
        emptyLabel="Noch keine Angebote erstellt."
        rows={offers.map((o: any) => ({
          id: o.id,
          primary: `${o.company?.name ?? "Ohne Kunde"} — ${formatCurrency(o.recommended_hourly_rate, o.currency)}/Std.`,
          secondary: `${o.status} · ${formatDate(o.created_at)}`,
          viewHref: `/rechner/pdf/${o.id}`,
          downloadHref: `/rechner/pdf/${o.id}?download=1`,
        }))}
      />

      <DocumentSection
        title="Verträge"
        emptyLabel="Noch keine Verträge erstellt."
        rows={contractDocs.map((c: any) => ({
          id: c.id,
          primary: `${c.contract_number} — ${c.company?.name ?? "Ohne Kunde"}`,
          secondary: `${c.status} · ${formatCurrency(c.fee, c.currency)} · ${formatDate(c.created_at)}`,
          viewHref: `/vertraege`,
          downloadHref: undefined,
        }))}
      />
    </div>
  );
}

function DocumentSection({
  title,
  emptyLabel,
  rows,
}: {
  title: string;
  emptyLabel: string;
  rows: { id: string; primary: string; secondary: string; viewHref: string; downloadHref?: string }[];
}) {
  return (
    <div className="rounded-lg border border-surface-border bg-white shadow-panel">
      <div className="border-b border-surface-border px-5 py-3">
        <h2 className="text-sm font-medium text-ink">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-muted">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-surface-border">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-light text-brand">
                  <FileText className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="font-medium text-ink">{row.primary}</p>
                  <p className="text-xs text-ink-muted">{row.secondary}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  href={row.viewHref}
                  target="_blank"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-subtle hover:text-ink"
                  title="Ansehen"
                >
                  <Eye className="h-4 w-4" />
                </Link>
                {row.downloadHref && (
                  <Link
                    href={row.downloadHref}
                    target="_blank"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-subtle hover:text-ink"
                    title="Herunterladen"
                  >
                    <Download className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
