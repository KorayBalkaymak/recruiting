import { requireCandidate } from "@/lib/auth";
import { getCandidatePortalView } from "@/lib/candidate/portal-service";
import { CandidateProfileForm } from "@/components/candidate/profile-form";
import { CandidateCvUploadForm } from "@/components/candidate/cv-upload-form";

export default async function CandidateProfilePage() {
  const candidate = await requireCandidate();
  const profile = await getCandidatePortalView(candidate);

  if (!profile) {
    return <p className="text-sm text-status-danger">Profil konnte nicht geladen werden.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand">Profil</p>
        <h1 className="mt-2 text-[1.85rem] font-normal tracking-tight text-ink">Angaben zur Prüfung</h1>
        <p className="mt-2 max-w-[48ch] text-sm leading-6 text-ink-muted">
          Speichere Entwürfe oder reiche dein Profil zur internen Prüfung ein.
        </p>
      </div>
      <div className="rounded-lg border border-surface-border bg-white p-5 shadow-panel">
        <CandidateProfileForm profile={profile} />
      </div>
      <CandidateCvUploadForm />
    </div>
  );
}
