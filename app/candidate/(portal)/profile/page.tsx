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
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Mein Profil</h1>
        <p className="text-sm text-ink-muted">
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
