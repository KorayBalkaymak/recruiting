export const MAX_TERMS_PER_KIND = 30;
export const MAX_TERM_LENGTH = 64;
export const MIN_SEARCH_RADIUS_KM = 1;
export const MAX_SEARCH_RADIUS_KM = 200;

export type CandidateTermKind = "skill" | "keyword" | "qualification" | "industry";

export function normalizeTerm(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, MAX_TERM_LENGTH);
}

export function sanitizeTermList(raw: unknown, kind: CandidateTermKind): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const display = item.trim().replace(/\s+/g, " ").slice(0, MAX_TERM_LENGTH);
    const normalized = normalizeTerm(display);
    if (!normalized || seen.has(`${kind}:${normalized}`)) continue;
    seen.add(`${kind}:${normalized}`);
    out.push(display);
    if (out.length >= MAX_TERMS_PER_KIND) break;
  }
  return out;
}

export function assertSearchRadius(km: number) {
  if (!Number.isFinite(km) || km < MIN_SEARCH_RADIUS_KM || km > MAX_SEARCH_RADIUS_KM) {
    throw new Error(`Suchradius muss zwischen ${MIN_SEARCH_RADIUS_KM} und ${MAX_SEARCH_RADIUS_KM} km liegen.`);
  }
}
