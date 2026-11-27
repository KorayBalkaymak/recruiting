"use client";

import { useRef, useState, useTransition } from "react";
import { saveProfileDraftAction, submitProfileAction } from "@/app/candidate/actions";
import {
  KeywordCatalogPicker,
  QualificationCatalogPicker,
} from "@/components/candidate/catalog-picker";
import { SubmitSuccessToast } from "@/components/candidate/submit-success-toast";
import type { CandidatePortalView } from "@/lib/candidate/portal-service";
import { portalStatusLabels } from "@/lib/candidate/status-labels";
import { SEARCH_RADIUS_OPTIONS_KM } from "@/lib/candidate/terms";
import { cn } from "@/lib/utils";

function radiusChoices(current: number) {
  if ((SEARCH_RADIUS_OPTIONS_KM as readonly number[]).includes(current)) {
    return [...SEARCH_RADIUS_OPTIONS_KM];
  }
  return [...SEARCH_RADIUS_OPTIONS_KM, current].sort((a, b) => a - b);
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function CandidateProfileForm({
  profile,
  hasCv = false,
  hasQualifications = false,
}: {
  profile: CandidatePortalView;
  hasCv?: boolean;
  hasQualifications?: boolean;
}) {
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
    profile.searchRadiusKm != null ? profile.searchRadiusKm : 50
  );
  const [hourlyRateNet, setHourlyRateNet] = useState(
    profile.hourlyRateNet != null ? String(profile.hourlyRateNet) : ""
  );
  const [availabilityDate, setAvailabilityDate] = useState(profile.availabilityDate ?? "");
  const [skills, setSkills] = useState(profile.skills.join(", "));
  const [keywords, setKeywords] = useState<string[]>(profile.keywords);
  const [qualifications, setQualifications] = useState<string[]>(profile.qualifications);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();
  const feedbackRef = useRef<HTMLParagraphElement>(null);

  function showError(text: string) {
    setError(text);
    window.requestAnimationFrame(() => {
      feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

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

  function submitBlocker() {
    if (!hasCv || !hasQualifications) {
      return "Lebenslauf und Qualifikationen sind Pflichtfelder. Bitte beide Dateien oben hochladen.";
    }
    if (!firstName.trim() || !lastName.trim()) return "Vor- und Nachname sind Pflichtfelder.";
    if (!profile.email?.trim()) return "E-Mail ist ein Pflichtfeld.";
    if (!desiredRole.trim()) return "Gewünschte Tätigkeit ist ein Pflichtfeld.";
    if (!summary.trim()) return "Kurzprofil ist ein Pflichtfeld.";
    if (!yearsExperience.trim() || !Number.isFinite(Number(yearsExperience))) {
      return "Berufserfahrung ist ein Pflichtfeld.";
    }
    if (!city.trim()) return "Stadt ist ein Pflichtfeld.";
    if (!postalCode.trim()) return "PLZ ist ein Pflichtfeld.";
    if (!splitCsv(skills).length && keywords.length === 0) {
      return "Mindestens ein Skill oder ein Schlagwort ist erforderlich.";
    }
    const rate = Number(hourlyRateNet.trim().replace(",", "."));
    if (!hourlyRateNet.trim() || !Number.isFinite(rate) || rate <= 0) {
      return "Stundensatz (netto) ist ein Pflichtfeld.";
    }
    if (!availabilityDate.trim()) return "Verfügbar ab ist ein Pflichtfeld.";
    return null;
  }

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
      searchRadiusKm,
      hourlyRateNet: (() => {
        const rate = Number(hourlyRateNet.trim().replace(",", "."));
        return Number.isFinite(rate) && rate > 0 ? rate : null;
      })(),
      availabilityDate: availabilityDate.trim() || null,
      skills: splitCsv(skills),
      keywords,
      qualifications,
    };
  }

  return (
    <div className="flex flex-col gap-4">
      <SubmitSuccessToast show={sent} />
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

      {error && (
        <p ref={feedbackRef} className="rounded-md bg-red-50 px-3 py-2 text-sm text-status-danger">
          {error}
        </p>
      )}
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
      <Field
        label="E-Mail"
        value={profile.email ?? ""}
        onChange={() => undefined}
        required
        disabled
      />
      <Field
        label="Gewünschte Tätigkeit / Beruf"
        value={desiredRole}
        onChange={setDesiredRole}
        required
        disabled={!canEdit}
      />
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Kurzprofil *</span>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={4}
          required
          disabled={!canEdit}
          className="rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-surface-subtle"
        />
      </label>
      <Field
        label="Berufserfahrung (Jahre)"
        value={yearsExperience}
        onChange={setYearsExperience}
        type="number"
        required
        disabled={!canEdit}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Stundensatz (netto)"
          value={hourlyRateNet}
          onChange={setHourlyRateNet}
          type="number"
          required
          disabled={!canEdit}
          hint="Euro pro Stunde, netto"
        />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Verfügbar ab *</span>
          <input
            type="date"
            required
            disabled={!canEdit}
            aria-label="Verfügbar ab"
            value={availabilityDate}
            onChange={(e) => setAvailabilityDate(e.target.value)}
            className="w-full max-w-[12.5rem] rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-surface-subtle"
          />
          <span className="text-xs text-ink-muted">Kalender öffnen und Datum wählen</span>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Stadt / Standort" value={city} onChange={setCity} required disabled={!canEdit} />
        <Field label="PLZ" value={postalCode} onChange={setPostalCode} required disabled={!canEdit} />
        <Field label="Land" value={country} onChange={setCountry} disabled={!canEdit} />
      </div>
      <div>
        <p className="text-sm font-medium text-ink">Suchradius</p>
        <p className="mt-1 text-xs text-ink-muted">Umkreis um den Standort, in dem du einsetzbar bist.</p>
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Suchradius">
          {radiusChoices(searchRadiusKm).map((km) => {
            const active = searchRadiusKm === km;
            return (
              <button
                key={km}
                type="button"
                disabled={!canEdit}
                aria-pressed={active}
                onClick={() => setSearchRadiusKm(km)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[13px] transition-colors",
                  active
                    ? "border-[#141C6B] bg-[#141C6B] text-white"
                    : "border-[#D8DCE8] bg-white text-ink hover:border-[#141C6B]/40",
                  !canEdit && "cursor-not-allowed opacity-60"
                )}
              >
                {km} km
              </button>
            );
          })}
        </div>
      </div>
      <Field
        label="Skills (kommagetrennt)"
        value={skills}
        onChange={setSkills}
        hint="z. B. TypeScript, React, PostgreSQL"
        disabled={!canEdit}
      />
      <KeywordCatalogPicker selected={keywords} onChange={setKeywords} disabled={!canEdit} />
      <QualificationCatalogPicker
        selected={qualifications}
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
          disabled={isPending || !canSubmit || sent}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          onClick={() =>
            startTransition(async () => {
              setError(null);
              setMessage(null);
              const blocked = submitBlocker();
              if (blocked) {
                showError(blocked);
                return;
              }
              try {
                const payload = buildPayload();
                if (payload.skills.length === 0 && payload.keywords.length > 0) {
                  payload.skills = payload.keywords;
                }
                await saveProfileDraftAction(payload);
                const result = await submitProfileAction();
                if (!result.ok) {
                  showError(result.error);
                  return;
                }
                setSent(true);
                window.setTimeout(() => {
                  window.location.assign("/candidate/status?sent=1");
                }, 700);
              } catch (e) {
                const digest =
                  typeof e === "object" && e && "digest" in e
                    ? String((e as { digest?: string }).digest)
                    : "";
                if (digest.includes("NEXT_REDIRECT") || (e instanceof Error && e.message === "NEXT_REDIRECT")) {
                  setSent(true);
                  window.location.assign("/candidate/status?sent=1");
                  return;
                }
                showError(e instanceof Error && e.message ? e.message : "Einreichung fehlgeschlagen.");
              }
            })
          }
        >
          {isPending ? "Wird eingereicht…" : "Zur Prüfung einreichen"}
        </button>
      </div>
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-status-danger">{error}</p>
      )}
      {!canSubmit && lockedMessage && (
        <p className="text-sm text-ink-muted">{lockedMessage}</p>
      )}
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
      <span className="font-medium text-ink">
        {label}
        {required ? " *" : ""}
      </span>
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
