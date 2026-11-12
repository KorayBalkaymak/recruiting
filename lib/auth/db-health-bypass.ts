/**
 * Temporary unauthenticated access to the DB health probe.
 * Fail-closed: only the exact path, only when ENABLE_DB_HEALTH=true.
 */
export function shouldAllowUnauthenticatedDbHealth(
  pathname: string,
  enableDbHealth: string | undefined | null
): boolean {
  if (enableDbHealth !== "true") return false;
  return pathname === "/api/health/db";
}
