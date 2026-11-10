/**
 * In-memory marker that a password-setup / reset email is still outstanding.
 * Stores only the email address — never tokens, URLs, or passwords.
 * Cleared after a successful mail send; kept on failure for ops visibility.
 * Pure helper (Node-testable) — no secrets, no I/O.
 */
const awaitingPasswordEmail = new Set<string>();

export function markInviteAwaitingPasswordEmail(email: string) {
  awaitingPasswordEmail.add(email.trim().toLowerCase());
}

export function clearInviteAwaitingPasswordEmail(email: string) {
  awaitingPasswordEmail.delete(email.trim().toLowerCase());
}

export function isInviteAwaitingPasswordEmail(email: string) {
  return awaitingPasswordEmail.has(email.trim().toLowerCase());
}

export function countInvitesAwaitingPasswordEmail() {
  return awaitingPasswordEmail.size;
}
