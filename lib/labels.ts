import type { BadgeProps } from "@/components/ui/badge";

type LabelMap<T extends string> = Record<T, { label: string; variant: BadgeProps["variant"] }>;

export const candidateStatusLabels: LabelMap<
  "neu_eingegangen" | "in_bearbeitung" | "profil_fertig" | "in_einreichung" | "inaktiv"
> = {
  neu_eingegangen: { label: "Neu eingegangen", variant: "blue" },
  in_bearbeitung: { label: "In Bearbeitung", variant: "amber" },
  profil_fertig: { label: "Profil fertig", variant: "green" },
  in_einreichung: { label: "In Einreichung", variant: "brand" },
  inaktiv: { label: "Inaktiv", variant: "neutral" },
};

export const candidateTabs = [
  { value: "alle", label: "Alle Kandidaten" },
  { value: "neu_eingegangen", label: "Neu eingegangen" },
  { value: "in_bearbeitung", label: "In Bearbeitung" },
  { value: "profil_fertig", label: "Profil fertig" },
  { value: "in_einreichung", label: "In Einreichung" },
  { value: "inaktiv", label: "Inaktiv" },
] as const;

export const companyStatusLabels: LabelMap<
  "neukunde" | "aktiv" | "ohne_aktive_vakanz" | "inaktiv"
> = {
  neukunde: { label: "Neukunde", variant: "blue" },
  aktiv: { label: "Aktiv", variant: "green" },
  ohne_aktive_vakanz: { label: "Ohne aktive Vakanz", variant: "amber" },
  inaktiv: { label: "Inaktiv", variant: "neutral" },
};

export const companyInactiveReasonLabels: Record<string, string> = {
  projekt_abgeschlossen: "Projekt abgeschlossen",
  kein_bedarf_mehr: "Kein Bedarf mehr",
  budget_gestoppt: "Budget gestoppt",
  keine_rueckmeldung: "Keine Rückmeldung",
  strategische_neuausrichtung: "Strategische Neuausrichtung",
};

export const vacancyStatusLabels: LabelMap<
  "neue_anfrage" | "offen" | "in_bearbeitung" | "besetzt" | "geschlossen"
> = {
  neue_anfrage: { label: "Neue Anfrage", variant: "blue" },
  offen: { label: "Offen", variant: "brand" },
  in_bearbeitung: { label: "In Bearbeitung", variant: "amber" },
  besetzt: { label: "Besetzt", variant: "green" },
  geschlossen: { label: "Geschlossen", variant: "neutral" },
};

export const submissionStatusLabels: Record<string, string> = {
  vorgeschlagen: "Vorgeschlagen",
  angefragt: "Angefragt",
  in_pruefung: "In Prüfung",
  verfuegbar: "Verfügbar",
  abgelehnt: "Abgelehnt",
  vorstellungsgespraech: "Vorstellungsgespräch",
  besetzt: "Besetzt",
};

export const employmentTypeLabels: Record<string, string> = {
  festanstellung: "Festanstellung",
  arbeitnehmerueberlassung: "Arbeitnehmerüberlassung",
  freelance: "Freelance",
  werkvertrag: "Werkvertrag",
};

export const factorTierLabels: Record<
  "basis" | "standard" | "spezialist" | "premium",
  { label: string; factor: number; description: string }
> = {
  basis: { label: "Basis", factor: 2.0, description: "Lange Laufzeit, geringes Risiko" },
  standard: { label: "Standard", factor: 2.2, description: "Normale Verfügbarkeit, reguläre Dauer" },
  spezialist: { label: "Spezialist", factor: 2.3, description: "Senior/Projektleitung, spezielle Qualifikation" },
  premium: { label: "Premium", factor: 2.4, description: "Schwer verfügbar, kurzfristiger Start" },
};

export const offerStatusLabels: LabelMap<
  "entwurf" | "zur_freigabe" | "in_pruefung" | "freigegeben" | "abgelehnt"
> = {
  entwurf: { label: "Entwurf", variant: "neutral" },
  zur_freigabe: { label: "Zur Freigabe gesendet", variant: "blue" },
  in_pruefung: { label: "In Prüfung", variant: "amber" },
  freigegeben: { label: "Freigegeben", variant: "green" },
  abgelehnt: { label: "Abgelehnt", variant: "red" },
};
