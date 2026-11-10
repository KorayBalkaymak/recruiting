/**
 * Better Auth callback URL points at `/api/auth/reset-password/:token?callbackURL=...`.
 * Prefer a direct app link to `/login/set-password?token=...` when we can parse the token.
 */
export function rewriteResetCallbackUrl(
  betterAuthUrl: string,
  appBaseUrl = ""
): string {
  try {
    const parsed = new URL(betterAuthUrl);
    const match = parsed.pathname.match(/\/reset-password\/([^/]+)/);
    const token = match?.[1];
    const callback = parsed.searchParams.get("callbackURL");
    if (token && callback) {
      const target = new URL(callback);
      target.searchParams.set("token", token);
      return target.toString();
    }
    if (token) {
      const base = (appBaseUrl || parsed.origin).replace(/\/$/, "");
      return `${base}/login/set-password?token=${encodeURIComponent(token)}`;
    }
  } catch {
    // fall through
  }
  return betterAuthUrl;
}
