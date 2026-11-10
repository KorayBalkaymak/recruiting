export type PrincipalKind = "anonymous" | "staff" | "candidate";

export type RouteClass =
  | "public"
  | "auth_api"
  | "staff_login"
  | "candidate_login"
  | "staff"
  | "candidate";

export type RouteDecision =
  | { action: "allow" }
  | { action: "redirect"; location: string }
  | { action: "unauthorized"; status: 401 | 403 };

/**
 * Fail-closed path classification.
 * Unknown / new app routes default to `staff` (must be authenticated internal).
 */
export function classifyPath(pathname: string): RouteClass {
  if (pathname.startsWith("/api/auth")) return "auth_api";

  if (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/candidate/login" ||
    pathname.startsWith("/candidate/login/") ||
    pathname === "/candidate/register" ||
    pathname.startsWith("/candidate/register/")
  ) {
    if (pathname.startsWith("/candidate/")) return "candidate_login";
    return "staff_login";
  }

  if (pathname.startsWith("/candidate") || pathname.startsWith("/api/candidate")) {
    return "candidate";
  }

  // Staff CRM, staff APIs, PDFs under app routes, portal reviews, etc.
  return "staff";
}

export function isApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

export function isPdfPath(pathname: string): boolean {
  return pathname.includes("/pdf");
}

/** Keep in sync with lib/auth/roles.ts — inlined so Node tests need no path aliases. */
export function principalFromRole(role: unknown): PrincipalKind | null {
  if (role === "candidate") return "candidate";
  if (
    role === "recruiter" ||
    role === "kam" ||
    role === "geschaeftsleitung" ||
    role === "admin"
  ) {
    return "staff";
  }
  return null;
}

/**
 * Pure access decision. Layouts/actions remain additional enforcement.
 */
export function decideRouteAccess(input: {
  pathname: string;
  principal: PrincipalKind;
  /** When true, prefer JSON 401/403 over browser redirects. */
  preferStatus?: boolean;
}): RouteDecision {
  const route = classifyPath(input.pathname);
  // Browser PDF routes redirect like pages; API routes return 401/403 JSON.
  const apiLike = input.preferStatus ?? isApiPath(input.pathname);

  if (route === "auth_api" || route === "public") {
    return { action: "allow" };
  }

  if (route === "staff_login") {
    if (input.principal === "staff") {
      // Allow password-setup while authenticated.
      if (input.pathname.startsWith("/login/set-password")) return { action: "allow" };
      return { action: "redirect", location: "/" };
    }
    if (input.principal === "candidate") {
      return { action: "redirect", location: "/candidate/dashboard" };
    }
    return { action: "allow" };
  }

  if (route === "candidate_login") {
    if (input.principal === "candidate") {
      return { action: "redirect", location: "/candidate/dashboard" };
    }
    if (input.principal === "staff") {
      return { action: "redirect", location: "/" };
    }
    return { action: "allow" };
  }

  if (route === "candidate") {
    if (input.principal === "candidate") return { action: "allow" };
    if (input.principal === "staff") {
      if (apiLike) return { action: "unauthorized", status: 403 };
      return { action: "redirect", location: "/" };
    }
    if (apiLike) return { action: "unauthorized", status: 401 };
    return { action: "redirect", location: "/candidate/login" };
  }

  // staff (default / fail-closed)
  if (input.principal === "staff") return { action: "allow" };
  if (input.principal === "candidate") {
    if (apiLike) return { action: "unauthorized", status: 403 };
    return { action: "redirect", location: "/candidate/dashboard" };
  }
  if (apiLike) return { action: "unauthorized", status: 401 };
  return { action: "redirect", location: "/login" };
}
