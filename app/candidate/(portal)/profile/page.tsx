import { requireCandidate } from "@/lib/auth";
import {
  getOwnCandidateCertificateMeta,
  getOwnCandidateCvMeta,
} from "@/lib/candidate/cv-upload";
import { getCandidatePortalView } from "@/lib/candidate/portal-service";
import { CandidateProfileForm } from "@/components/candidate/profile-form";
import { CandidateDocumentUploadForm } from "@/components/candidate/cv-upload-form";

export default async function CandidateProfilePage() {
  const candidate = await requireCandidate();
  const [profile, cv, certificate] = await Promise.all([
    getCandidatePortalView(candidate),
    getOwnCandidateCvMeta(candidate).catch(() => null),
    getOwnCandidateCertificateMeta(candidate).catch(() => null),
  ]);

  if (!profile) {
    return <p className="text-sm text-status-danger">Profil konnte nicht geladen werden.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand">Profil</p>
        <h1 className="mt-2 text-[1.85rem] font-normal tracking-tight text-ink">Angaben zur Prüfung</h1>
        <p className="mt-2 max-w-[48ch] text-sm leading-6 text-ink-muted">
          Lebenslauf und Qualifikationen sind Pflicht. Danach Angaben speichern oder zur Prüfung
          einreichen.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <CandidateDocumentUploadForm kind="cv" currentFileName={cv?.fileName} />
        <CandidateDocumentUploadForm
          kind="certificate"
          currentFileName={certificate?.fileName}
        />
      </div>
      <div className="rounded-lg border border-surface-border bg-white p-5 shadow-panel">
        <CandidateProfileForm
          profile={profile}
          hasCv={Boolean(cv?.fileName)}
          hasQualifications={Boolean(certificate?.fileName)}
        />
      </div>
    </div>
  );
}
