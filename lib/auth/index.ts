export { getAuth, syncAuthUserRole } from "./auth";
export {
  ActorAccessError,
  assertCandidateActor,
  assertCandidateOwnsResource,
  assertOfferReviewerActor,
  assertStaffActor,
  assertUserManagerActor,
  resolveBoundCandidateId,
} from "./actor-binding";
export { runAsCandidateSignup, isCandidateSignup } from "./candidate-context";
export { AuthError, toAuthHttpError, toSafeAuthMessage } from "./errors";
export {
  requireAdmin,
  requireCandidate,
  requireOfferReviewer,
  requireRoles,
  requireStaff,
  requireUserManager,
} from "./guards";
export { runAsInternalInvite } from "./invite-context";
export {
  clearInviteAwaitingPasswordEmail,
  countInvitesAwaitingPasswordEmail,
  isInviteAwaitingPasswordEmail,
  markInviteAwaitingPasswordEmail,
} from "./invite-delivery";
export {
  CANDIDATE_ROLE,
  INTERNAL_ROLES,
  assertStaffProfileForRoleChange,
  canManageUsers,
  canReviewOffers,
  isAppRole,
  isCandidateRole,
  isInternalRole,
  isStaffRole,
  type AppRole,
  type CandidateUser,
  type InternalRole,
  type StaffUser,
} from "./roles";
export { getSessionCandidate, getSessionStaff } from "./session";
