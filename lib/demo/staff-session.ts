/** App-facing re-exports for staff demo sessions. */
export {
  createDemoStaffSessionToken,
  demoStaffCookieOptions,
  DEMO_STAFF_SESSION_TTL_SECONDS,
  resolveDemoSessionSecret,
  verifyDemoStaffSessionToken,
  type DemoStaffSessionPayload,
} from "./session-crypto";
