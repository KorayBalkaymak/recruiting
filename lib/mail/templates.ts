import type { MailKind, MailMessage } from "./types";

/** Keep labels aligned with lib/candidate/status-labels.ts (inlined for Node tests). */
const PORTAL_STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  submitted: "Eingereicht",
  in_review: "In Prüfung",
  changes_requested: "Änderungen angefordert",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildStaffInviteEmail(input: {
  to: string;
  fullName: string;
  setupUrl: string;
}): MailMessage {
  const subject = "Einladung zur CMS Recruiting-Plattform";
  const text = [
    `Hallo ${input.fullName},`,
    "",
    "du wurdest zur CMS Recruiting-Plattform eingeladen.",
    "Bitte lege über den folgenden Link ein Passwort fest (Link ist zeitlich begrenzt und nur einmal nutzbar):",
    input.setupUrl,
    "",
    "Falls du diese Einladung nicht erwartet hast, ignoriere diese E-Mail.",
  ].join("\n");

  const html = `
    <p>Hallo ${escapeHtml(input.fullName)},</p>
    <p>du wurdest zur CMS Recruiting-Plattform eingeladen.</p>
    <p>Bitte lege über den folgenden Link ein Passwort fest
    (Link ist zeitlich begrenzt und nur einmal nutzbar):</p>
    <p><a href="${escapeHtml(input.setupUrl)}">Passwort festlegen</a></p>
    <p>Falls du diese Einladung nicht erwartet hast, ignoriere diese E-Mail.</p>
  `.trim();

  return { kind: "staff_invite", to: input.to, subject, text, html };
}

export function buildPasswordResetEmail(input: {
  to: string;
  fullName?: string;
  resetUrl: string;
}): MailMessage {
  const greeting = input.fullName?.trim() ? `Hallo ${input.fullName.trim()},` : "Hallo,";
  const subject = "Passwort zurücksetzen – CMS Recruiting-Plattform";
  const text = [
    greeting,
    "",
    "du hast das Zurücksetzen deines Passworts angefordert.",
    "Nutze den folgenden Link (zeitlich begrenzt, einmalig):",
    input.resetUrl,
    "",
    "Falls du das nicht warst, ignoriere diese E-Mail.",
  ].join("\n");

  const html = `
    <p>${escapeHtml(greeting)}</p>
    <p>du hast das Zurücksetzen deines Passworts angefordert.</p>
    <p>Nutze den folgenden Link (zeitlich begrenzt, einmalig):</p>
    <p><a href="${escapeHtml(input.resetUrl)}">Passwort zurücksetzen</a></p>
    <p>Falls du das nicht warst, ignoriere diese E-Mail.</p>
  `.trim();

  return { kind: "password_reset", to: input.to, subject, text, html };
}

export function buildPortalStatusEmail(input: {
  to: string;
  firstName: string;
  status: string;
  note?: string | null;
  statusUrl: string;
}): MailMessage {
  const label = PORTAL_STATUS_LABELS[input.status] ?? input.status;
  const subject = `Bewerbungsstatus: ${label}`;
  const noteLine = input.note?.trim()
    ? `Hinweis: ${input.note.trim()}`
    : "Weitere Details findest du in deinem Kandidaten-Portal.";

  const text = [
    `Hallo ${input.firstName},`,
    "",
    `der Status deines Profils wurde auf „${label}“ gesetzt.`,
    noteLine,
    "",
    `Portal: ${input.statusUrl}`,
  ].join("\n");

  const html = `
    <p>Hallo ${escapeHtml(input.firstName)},</p>
    <p>der Status deines Profils wurde auf „${escapeHtml(label)}“ gesetzt.</p>
    <p>${escapeHtml(noteLine)}</p>
    <p><a href="${escapeHtml(input.statusUrl)}">Zum Portal</a></p>
  `.trim();

  return { kind: "portal_status", to: input.to, subject, text, html };
}

export function buildPortalSubmittedStaffEmail(input: {
  to: string;
  candidateLabel: string;
  reviewUrl: string;
}): MailMessage {
  const subject = "Neues Kandidatenprofil zur Prüfung";
  const text = [
    "Ein Kandidatenprofil wurde zur Prüfung eingereicht.",
    `Kandidat: ${input.candidateLabel}`,
    `Prüfen: ${input.reviewUrl}`,
  ].join("\n");

  const html = `
    <p>Ein Kandidatenprofil wurde zur Prüfung eingereicht.</p>
    <p>Kandidat: ${escapeHtml(input.candidateLabel)}</p>
    <p><a href="${escapeHtml(input.reviewUrl)}">Zur Prüfung</a></p>
  `.trim();

  return { kind: "portal_submitted", to: input.to, subject, text, html };
}

export function classifyPasswordEmailKind(isInviteContext: boolean): MailKind {
  return isInviteContext ? "staff_invite" : "password_reset";
}
