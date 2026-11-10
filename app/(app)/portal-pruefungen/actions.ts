"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { ConflictError } from "@/lib/auth/conflicts";
import { transitionPortalReview } from "@/lib/candidate/portal-service";
import type { PortalProfileStatus } from "@/lib/candidate/portal-types";

export async function reviewPortalProfileAction(
  candidateId: string,
  toStatus: PortalProfileStatus,
  note?: string
) {
  const staff = await requireStaff();
  try {
    await transitionPortalReview(staff, candidateId, toStatus, note);
  } catch (error) {
    if (error instanceof ConflictError) {
      throw new Error(error.message);
    }
    throw error;
  }
  revalidatePath("/portal-pruefungen");
  revalidatePath(`/portal-pruefungen/${candidateId}`);
}
