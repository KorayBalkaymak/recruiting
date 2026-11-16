import { NextResponse, type NextRequest } from "next/server";
import { DEMO_CANDIDATE_COOKIE, DEMO_COOKIE, isDemoMode } from "@/lib/demo/mode";
import { verifyDemoCandidateSessionToken } from "@/lib/demo/candidate-session";
import { verifyDemoStaffSessionToken } from "@/lib/demo/staff-session";
import { findDemoUserById } from "@/lib/demo/store";
import { isInternalRole } from "@/lib/auth/roles";
import { resolveLivePrincipal } from "@/lib/auth/live-edge-session";
import {
  classifyPath,
  decideRouteAccess,
  type PrincipalKind,
} from "@/lib/auth/route-policy";

function redirectTo(request: NextRequest, pathname: string) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname;
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl);
}

function applyDecision(request: NextRequest, decision: ReturnType<typeof decideRouteAccess>) {
  if (decision.action === "allow") return NextResponse.next();
  if (decision.action === "redirect") return redirectTo(request, decision.location);
  return NextResponse.json(
    { error: decision.status === 401 ? "Anmeldung erforderlich." : "Keine Berechtigung." },
    { status: decision.status }
  );
}

async function resolveDemoPrincipal(request: NextRequest): Promise<PrincipalKind> {
  const staffToken = request.cookies.get(DEMO_COOKIE)?.value;
  const staffPayload = await verifyDemoStaffSessionToken(staffToken);
  if (staffPayload) {
    const demo = findDemoUserById(staffPayload.userId);
    if (demo && isInternalRole(demo.role)) return "staff";
  }

  const candidateToken = request.cookies.get(DEMO_CANDIDATE_COOKIE)?.value;
  const candidatePayload = await verifyDemoCandidateSessionToken(candidateToken);
  if (candidatePayload) {
    // HMAC token is authoritative in Edge. Newly registered demo accounts live in the
    // Node isolate and are invisible here — layouts still enforce account existence.
    return "candidate";
  }

  return "anonymous";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Better Auth handler must remain reachable without recursive session checks.
  if (classifyPath(pathname) === "auth_api") {
    return NextResponse.next();
  }

  const principal = isDemoMode()
    ? await resolveDemoPrincipal(request)
    : await resolveLivePrincipal(request);

  const decision = decideRouteAccess({ pathname, principal });
  return applyDecision(request, decision);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
