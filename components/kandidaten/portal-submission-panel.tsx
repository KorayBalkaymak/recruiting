import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { portalStatusLabels } from "@/lib/candidate/status-labels";
import type { CandidatePortalView } from "@/lib/candidate/portal-service";
import { formatCurrency, formatDate } from "@/lib/utils";

function isPdf(mimeType: string | null | undefined, fileName: string) {
  return (mimeType ?? "").includes("pdf") || fileName.toLowerCase().endsWith(".pdf");
}

function DocumentPreview({
  title,
  fileName,
  mimeType,
  href,
}: {
  title: string;
  fileName: string | null;
  mimeType?: string | null;
  href: string;
}) {
  if (!fileName) {
    return (
      <div className="rounded-md border border-dashed border-surface-border px-4 py-8 text-center text-sm text-ink-muted">
        {title}: noch keine Datei
      </div>
    );
  }

  const previewHref = `${href}?preview=1`;

  return (
    <div className="overflow-hidden rounded-md border border-surface-border">
      <div className="flex items-center justify-between gap-3 border-b border-surface-border bg-surface-subtle px-4 py-2.5">
        <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink">
          <FileText className="h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />
          <span className="truncate">{title}</span>
        </p>
        <a href={href} className="shrink-0 text-xs font-medium text-brand hover:underline">
          Herunterladen
        </a>
      </div>
      {isPdf(mimeType, fileName) ? (
        <iframe src={previewHref} title={title} className="h-[420px] w-full bg-white" />
      ) : (
        <p className="px-4 py-6 text-sm text-ink-muted">
          {fileName} — Vorschau nur für PDF. Datei über „Herunterladen“ öffnen.
        </p>
      )}
    </div>
  );
}

export function PortalSubmissionPanel({
  profile,
  cvFileName,
  cvMimeType,
  certificateFileName,
  certificateMimeType,
}: {
  profile: CandidatePortalView | null;
  cvFileName: string | null;
  cvMimeType?: string | null;
  certificateFileName: string | null;
  certificateMimeType?: string | null;
}) {
  if (!profile) {
    return (
      <section className="crm-panel p-5">
        <h2 className="text-sm font-semibold text-ink">Vom Kandidaten eingereicht</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Zu diesem Datensatz gibt es noch keine Portal-Einreichung.
        </p>
      </section>
    );
  }

  const id = profile.candidateId;

  return (
    <section className="crm-panel flex flex-col gap-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Vom Kandidaten eingereicht</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Originalangaben und Dateien aus dem Kandidatenportal.
          </p>
        </div>
        <Badge variant="neutral">{portalStatusLabels[profile.status]}</Badge>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Meta label="Tätigkeit" value={profile.desiredRole} />
        <Meta
          label="Standort"
          value={[profile.city, profile.postalCode].filter(Boolean).join(", ") || null}
        />
        <Meta
          label="Stundensatz (netto)"
          value={profile.hourlyRateNet != null ? `${formatCurrency(profile.hourlyRateNet)} / Std.` : null}
        />
        <Meta
          label="Verfügbar ab"
          value={profile.availabilityDate ? formatDate(profile.availabilityDate) : null}
        />
      </dl>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Kurzprofil</p>
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-ink">
          {profile.summary?.trim() || "Kein Kurztext hinterlegt."}
        </p>
      </div>

      {(profile.skills.length > 0 ||
        profile.keywords.length > 0 ||
        profile.qualifications.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-3">
          <ChipList label="Skills" values={profile.skills} />
          <ChipList label="Schlagworte" values={profile.keywords} />
          <ChipList label="Qualifikationen" values={profile.qualifications} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <DocumentPreview
          title="Lebenslauf"
          fileName={cvFileName}
          mimeType={cvMimeType}
          href={`/api/portal-pruefungen/${id}/cv`}
        />
        <DocumentPreview
          title="Qualifikationen"
          fileName={certificateFileName}
          mimeType={certificateMimeType}
          href={`/api/portal-pruefungen/${id}/qualifikationen`}
        />
      </div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

function ChipList({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      {values.length === 0 ? (
        <p className="mt-1 text-sm text-ink-muted">—</p>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <span
              key={value}
              className="rounded-full bg-surface-subtle px-2.5 py-0.5 text-xs text-ink"
            >
              {value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
