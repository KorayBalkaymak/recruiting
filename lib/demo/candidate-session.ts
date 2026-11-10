/** App-facing re-exports for candidate demo sessions. */
export {
  createDemoCandidateSessionToken,
  demoCandidateCookieOptions,
  DEMO_CANDIDATE_SESSION_TTL_SECONDS,
  resolveDemoSessionSecret,
  verifyDemoCandidateSessionToken,
  type DemoCandidateSessionPayload,
} from "./session-crypto";
