import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getAuth,
  mapVerifyEmailError,
  parseVerifyEmailPageStatus,
  type VerifyEmailPageStatus,
} from "@/lib/auth";
import { peekCandidateSession } from "@/lib/auth/public-session";
import { isDemoMode } from "@/lib/demo/mode";
import { candidateResendVerificationAction } from "../actions";
import {
  AuthAlert,
  MarketingAuthShell,
  authButtonClass,
  authFineClass,
  authInputClass,
  authLabelClass,
  authLinkClass,
  authMutedClass,
} from "@/components/marketing/auth-shell";

async function resolveVerifyStatus(
  token?: string,
  rawStatus?: string
): Promise<VerifyEmailPageStatus> {
  if (!token?.trim()) return parseVerifyEmailPageStatus(rawStatus);
  if (isDemoMode()) return "invalid";

  try {
    await getAuth().api.verifyEmail({
      query: { token: token.trim() },
      headers: headers(),
    });
    return "ok";
  } catch (error) {
    return mapVerifyEmailError(error);
  }
}

const COPY: Record<
  VerifyEmailPageStatus,
  { title: string; description: string; alert?: { tone: "error" | "ok"; text: string } }
> = {
  check: {
    title: "E-Mail prüfen",
    description:
      "Falls ein Konto mit dieser Adresse angelegt wurde, haben wir einen Bestätigungslink verschickt. Bitte öffne den Link in der E-Mail, bevor du dich anmeldest.",
  },
  resent: {
    title: "E-Mail prüfen",
    description:
      "Falls ein unbestätigtes Konto existiert, haben wir den Bestätigungslink erneut gesendet. Prüfe dein Postfach und den Spam-Ordner.",
    alert: { tone: "ok", text: "Wenn ein unbestätigtes Konto existiert, ist die E-Mail unterwegs." },
  },
  ok: {
    title: "E-Mail bestätigt",
    description: "Deine Adresse ist bestätigt. Du kannst dich jetzt im Kandidatenportal anmelden.",
    alert: { tone: "ok", text: "Bestätigung erfolgreich. Bitte melde dich an." },
  },
  expired: {
    title: "Link abgelaufen",
    description:
      "Dieser Bestätigungslink ist nicht mehr gültig. Fordere bei Bedarf einen neuen Link an.",
    alert: { tone: "error", text: "Der Link ist abgelaufen." },
  },
  invalid: {
    title: "Link ungültig",
    description:
      "Dieser Bestätigungslink ist ungültig oder wurde bereits verwendet. Fordere bei Bedarf einen neuen Link an.",
    alert: { tone: "error", text: "Der Link ist ungültig." },
  },
};

export default async function CandidateVerifyEmailPage({
  searchParams,
}: {
  searchParams: { token?: string; status?: string };
}) {
  const verifiedCandidate = await peekCandidateSession();
  if (verifiedCandidate && !searchParams.token) redirect("/candidate/dashboard");

  const status = await resolveVerifyStatus(searchParams.token, searchParams.status);
  const copy = COPY[status];
  const showResend = status !== "ok";

  return (
    <MarketingAuthShell audience="candidate" kicker="Portal" title={copy.title} description={copy.description}>
      {copy.alert ? <AuthAlert tone={copy.alert.tone}>{copy.alert.text}</AuthAlert> : null}

      {status === "ok" ? (
        <Link href="/candidate/login" className={`${authButtonClass} flex items-center justify-center`}>
          Zur Anmeldung
        </Link>
      ) : null}

      {showResend ? (
        <form action={candidateResendVerificationAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className={authLabelClass}>
              E-Mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={authInputClass}
            />
          </div>
          <button type="submit" className={authButtonClass}>
            Bestätigungs-E-Mail erneut senden
          </button>
        </form>
      ) : null}

      <p className={`mt-5 ${authMutedClass}`}>
        Bereits bestätigt?{" "}
        <Link href="/candidate/login" className={authLinkClass}>
          Anmelden
        </Link>
      </p>
      <p className={`mt-4 ${authFineClass}`}>
        <Link href="/candidate/register" className={authLinkClass}>
          Neue Registrierung
        </Link>
      </p>
    </MarketingAuthShell>
  );
}
