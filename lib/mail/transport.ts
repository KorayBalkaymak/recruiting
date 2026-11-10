import "server-only";

import { isDemoMode } from "@/lib/demo/mode";
import { hasResendConfig, readResendConfigFromEnv } from "./config";
import {
  createDemoMailTransport,
  createResendTransport,
  createUnavailableMailTransport,
} from "./resend-transport";
import type { MailTransport } from "./types";

/**
 * Resolves the mail transport:
 * - Demo: no-op success (never calls Resend)
 * - Live with Resend env: Resend HTTP API
 * - Live without env: unavailable (fail-closed)
 */
export function getMailTransport(): MailTransport {
  if (isDemoMode()) {
    return createDemoMailTransport();
  }
  const parsed = readResendConfigFromEnv();
  if (!parsed.ok) {
    return createUnavailableMailTransport([...parsed.missing, ...parsed.invalid]);
  }
  return createResendTransport(parsed.config);
}

export function describeMailStatus(): {
  mode: "demo" | "live";
  provider: "demo" | "resend" | "unavailable";
  configured: boolean;
} {
  if (isDemoMode()) {
    return { mode: "demo", provider: "demo", configured: true };
  }
  return {
    mode: "live",
    provider: hasResendConfig() ? "resend" : "unavailable",
    configured: hasResendConfig(),
  };
}
