import { FileText } from "lucide-react";
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
      <div className="rounded-md border border-dashed border-white/20 px-4 py-8 text-center text-sm text-white/60">
        {title}: noch keine Datei
      </div>
    );
  }

  const previewHref = `${href}?preview=1`;

  return (
    <div className="overflow-hidden rounded-md border border-white/15 bg-[#0B1038]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
        <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-white">
          <FileText className="h-4 w-4 shrink-0 text-[#E4572E]" strokeWidth={1.75} />
          <span className="truncate">{title}</span>
        </p>
        <a href={href} className="shrink-0 text-xs font-medium text-[#8B96D9] hover:underline">
          Herunterladen
        </a>
      </div>
      {isPdf(mimeType, fileName) ? (
        <iframe src={previewHref} title={title} className="h-[420px] w-full bg-white" />
      ) : (
        <p className="px-4 py-6 text-sm text-white/65">
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
      <section className="rounded-lg bg-[#141C6B] p-5 text-white shadow-panel">
        <h2 className="text-sm font-semibold text-white">Vom Kandidaten eingereicht</h2>
        <p className="mt-2 text-sm text-white/65">
          Zu diesem Datensatz gibt es noch keine Portal-Einreichung.
        </p>
      </section>
    );
  }

  const id = profile.candidateId;

  return (
    <section className="flex flex-col gap-5 rounded-lg bg-[#141C6B] p-5 text-white shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Vom Kandidaten eingereicht</h2>
          <p className="mt-0.5 text-xs text-white/65">
            Originalangaben und Dateien aus dem Kandidatenportal.
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white">
          {portalStatusLabels[profile.status]}
        </span>
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
        <p className="text-xs font-medium uppercase tracking-wide text-white/55">Kurzprofil</p>
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-white">
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
      <dt className="text-xs text-white/55">{label}</dt>
      <dd className="mt-0.5 text-sm text-white">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

function ChipList({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="text-xs text-white/55">{label}</p>
      {values.length === 0 ? (
        <p className="mt-1 text-sm text-white/50">—</p>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <span
              key={value}
              className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white"
            >
              {value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
