import type { PortalProfileStatus } from "@/lib/candidate/portal-types";

export const portalStatusLabels: Record<PortalProfileStatus, string> = {
  draft: "Entwurf",
  submitted: "Eingereicht",
  in_review: "In Prüfung",
  changes_requested: "Änderungen angefordert",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
};
