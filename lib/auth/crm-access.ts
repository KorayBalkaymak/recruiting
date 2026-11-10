import "server-only";

import { requireStaff } from "./guards";
import { assertStaffActor } from "./actor-binding";
import type { StaffUser } from "./roles";

/**
 * CRM query/action entry gate: valid staff session + staff-shaped actor.
 * Layout/middleware remain additional layers.
 */
export async function requireCrmStaff(): Promise<StaffUser> {
  const staff = await requireStaff();
  return assertStaffActor(staff);
}
