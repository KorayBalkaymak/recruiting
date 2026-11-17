export type PublicMarketplaceProfile = {
  displayName: string;
  desiredRole: string | null;
  summary: string | null;
  yearsExperience: number | null;
  city: string | null;
  country: string | null;
  skills: string[];
};

export type PublicMarketplaceFilter = {
  beruf?: string;
  q?: string;
};

export function publicDisplayName(firstName: string, lastName: string) {
  const first = firstName.trim() || "Talent";
  const initial = lastName.trim().charAt(0);
  return initial ? `${first} ${initial.toUpperCase()}.` : first;
}

export function normalizeBerufFilter(value: string | undefined | null) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed.toLowerCase() === "alle") return "";
  return trimmed;
}

export function matchesPublicMarketplaceFilter(
  profile: Pick<PublicMarketplaceProfile, "desiredRole" | "summary" | "skills" | "city">,
  filter: PublicMarketplaceFilter
): boolean {
  const beruf = normalizeBerufFilter(filter.beruf).toLowerCase();
  if (beruf && (profile.desiredRole ?? "").trim().toLowerCase() !== beruf) {
    return false;
  }

  const q = filter.q?.trim().toLowerCase() ?? "";
  if (!q) return true;

  const haystack = [
    profile.desiredRole,
    profile.summary,
    profile.city,
    ...profile.skills,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

export function uniqueDesiredRoles(profiles: PublicMarketplaceProfile[]) {
  const seen = new Set<string>();
  const roles: string[] = [];
  for (const profile of profiles) {
    const role = profile.desiredRole?.trim();
    if (!role) continue;
    const key = role.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    roles.push(role);
  }
  return roles.sort((a, b) => a.localeCompare(b, "de"));
}
