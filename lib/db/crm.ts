import "server-only";

import { getDb } from "@/lib/db";
import { activityLogs } from "@/lib/db/schema";

export type ActivityLogType =
  | "notiz"
  | "anruf"
  | "email"
  | "statusaenderung"
  | "meeting"
  | "dokument";

export function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

export function toIsoRequired(value: Date | string): string {
  return toIso(value) ?? new Date().toISOString();
}

export function num(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function insertActivityLog(input: {
  entityType: "company" | "candidate" | "vacancy" | "offer";
  entityId: string;
  type?: ActivityLogType;
  content: string;
  createdBy: string;
}) {
  const db = getDb();
  await db.insert(activityLogs).values({
    entityType: input.entityType,
    entityId: input.entityId,
    type: input.type ?? "notiz",
    content: input.content,
    createdBy: input.createdBy,
  });
}
