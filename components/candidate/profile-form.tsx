"use client";

import { useState, useTransition } from "react";
import { saveProfileDraftAction, submitProfileAction } from "@/app/candidate/actions";
import type { CandidatePortalView } from "@/lib/candidate/portal-service";
import { portalStatusLabels } from "@/lib/candidate/status-labels";

function splitCsv(value: string) {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function CandidateProfileForm({ profile }: { profile: CandidatePortalView }) {
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [desiredRole, setDesiredRole] = useState(profile.desiredRole ?? "");
  const [summary, setSummary] = useState(profile.summary ?? "");
  const [yearsExperience, setYearsExperience] = useState(
    profile.yearsExperience != null ? String(profile.yearsExperience) : ""
  );
  const [city, setCity] = useState(profile.city ?? "");
  const [postalCode, setPostalCode] = useState(profile.postalCode ?? "");
  const [country, setCountry] = useState(profile.country ?? "Deutschland");
  const [searchRadiusKm, setSearchRadiusKm] = useState(
    profile.searchRadiusKm != null ? String(profile.searchRadiusKm) : "50"
  );
  const [skills, setSkills] = useState(profile.skills.join(", "));
  const [keywords, setKeywords] = useState(profile.keywords.join(", "));
  const [qualifications, setQualifications] = useState(profile.qualifications.join(", "));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit = profile.status === "draft" || profile.status === "changes_requested";
  const canEdit =
    profile.status === "draft" ||
    profile.status === "changes_requested" ||
    profile.status === "approved";
  const lockedMessage =
    profile.status === "submitted" || profile.status === "in_review"
      ? "Das Profil ist eingereicht bzw. in Prüfung und kann derzeit nicht geändert werden."
      : profile.status === "rejected"
        ? "Abgelehnte Profile können nicht bearbeitet werden."
        : null;

  function buildPayload() {
    const years = yearsExperience.trim() ? Number(yearsExperience) : null;
    return {
      firstName,
      lastName,
      desiredRole,
      summary,
      yearsExperience: years != null && Number.isFinite(years) ? years : null,
      city,
      postalCode,
      country,
      searchRadiusKm: Number(searchRadiusKm),
      skills: splitCsv(skills),
      keywords: splitCsv(keywords),
      qualifications: splitCsv(qualifications),
    };
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md bg-surface-subtle px-3 py-2 text-sm text-ink-muted">
        Status: <span className="font-medium text-ink">{portalStatusLabels[profile.status]}</span>
      </div>

      {lockedMessage && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-ink">{lockedMessage}</p>
      )}
      {profile.status === "approved" && canEdit && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-ink">
          Änderungen an einem freigegebenen Profil setzen den Status zurück auf Entwurf und erfordern
          eine erneute Prüfung.
        </p>
      )}

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-status-danger">{error}</p>}
      {message && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-status-done">{message}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Vorname"
          value={firstName}
          onChange={setFirstName}
          required
          disabled={!canEdit}
        />
        <Field
          label="Nachname"
          value={lastName}
          onChange={setLastName}
          required
          disabled={!canEdit}
        />
      </div>
      <Field label="E-Mail" value={profile.email ?? ""} onChange={() => undefined} disabled />
      <Field
        label="Gewünschte Tätigkeit / Beruf"
        value={desiredRole}
        onChange={setDesiredRole}
        required
        disabled={!canEdit}
      />
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Kurzprofil</span>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={4}
          disabled={!canEdit}
          className="rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-surface-subtle"
        />
      </label>
      <Field
        label="Berufserfahrung (Jahre)"
        value={yearsExperience}
        onChange={setYearsExperience}
        type="number"
        disabled={!canEdit}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Stadt / Standort" value={city} onChange={setCity} required disabled={!canEdit} />
        <Field label="PLZ" value={postalCode} onChange={setPostalCode} disabled={!canEdit} />
        <Field label="Land" value={country} onChange={setCountry} disabled={!canEdit} />
      </div>
      <Field
        label="Suchradius (km, 1–200)"
        value={searchRadiusKm}
        onChange={setSearchRadiusKm}
        type="number"
        required
        disabled={!canEdit}
      />
      <Field
        label="Skills (kommagetrennt)"
        value={skills}
        onChange={setSkills}
        hint="z. B. TypeScript, React, PostgreSQL"
        disabled={!canEdit}
      />
      <Field
        label="Suchbegriffe / Keywords (kommagetrennt)"
        value={keywords}
        onChange={setKeywords}
        disabled={!canEdit}
      />
      <Field
        label="Qualifikationen (kommagetrennt)"
        value={qualifications}
        onChange={setQualifications}
        disabled={!canEdit}
      />

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          disabled={isPending || !canEdit}
          className="rounded-md border border-surface-border bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-surface-subtle disabled:opacity-50"
          onClick={() =>
            startTransition(async () => {
              setError(null);
              setMessage(null);
              try {
                await saveProfileDraftAction(buildPayload());
                setMessage("Entwurf gespeichert.");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
              }
            })
          }
        >
          Entwurf speichern
        </button>
        <button
          type="button"
          disabled={isPending || !canSubmit}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          onClick={() =>
            startTransition(async () => {
              setError(null);
              setMessage(null);
              try {
                await saveProfileDraftAction(buildPayload());
                await submitProfileAction();
                setMessage("Profil zur Prüfung eingereicht.");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Einreichung fehlgeschlagen.");
              }
            })
          }
        >
          Zur Prüfung einreichen
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  disabled,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-ink">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-surface-subtle"
      />
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}
