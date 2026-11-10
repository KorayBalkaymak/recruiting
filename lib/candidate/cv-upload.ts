import "server-only";

import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { candidateDocuments } from "@/lib/db/schema";
import type { CandidateUser, StaffUser } from "@/lib/auth";
import {
  assertCandidateActor,
  assertStaffActor,
  resolveBoundCandidateId,
} from "@/lib/auth/actor-binding";
import { isDemoMode } from "@/lib/demo/mode";
import {
  assertSafeCvUpload,
  buildPrivateStorageKey,
  getConfiguredPrivateBucketName,
  getPrivateDocumentStorage,
} from "@/lib/storage/private-documents";

const globalDemoMeta = globalThis as unknown as {
  __cmsDemoCvMeta?: Map<
    string,
    {
      documentId: string;
      candidateId: string;
      accountId: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      storagePath: string;
    }
  >;
};

function demoMeta() {
  if (!globalDemoMeta.__cmsDemoCvMeta) globalDemoMeta.__cmsDemoCvMeta = new Map();
  return globalDemoMeta.__cmsDemoCvMeta;
}

function sha256Hex(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function uploadCandidateCv(
  candidate: CandidateUser,
  file: { buffer: Buffer; mimeType: string; fileName: string; sizeBytes: number }
) {
  assertCandidateActor(candidate);
  const validated = assertSafeCvUpload({
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    fileName: file.fileName,
    buffer: file.buffer,
  });

  const storage = getPrivateDocumentStorage();
  if (!storage.isConfigured()) {
    throw new Error(
      "CV-Upload ist noch nicht konfiguriert (privater Storage fehlt). Bitte B2-Umgebungsvariablen setzen."
    );
  }

  const documentId = crypto.randomUUID();
  const storagePath = buildPrivateStorageKey({
    candidateId: candidate.candidateId,
    documentId,
  });
  const bucket = getConfiguredPrivateBucketName();
  const checksum = sha256Hex(file.buffer);

  await storage.put({
    key: storagePath,
    body: file.buffer,
    contentType: validated.mimeType,
  });

  if (isDemoMode()) {
    demoMeta().set(candidate.candidateId, {
      documentId,
      candidateId: candidate.candidateId,
      accountId: candidate.accountId,
      fileName: validated.fileName,
      mimeType: validated.mimeType,
      sizeBytes: validated.sizeBytes,
      storagePath,
    });
    return { documentId, mimeType: validated.mimeType, fileName: validated.fileName };
  }

  const db = getDb();
  await db
    .delete(candidateDocuments)
    .where(
      and(
        eq(candidateDocuments.candidateId, candidate.candidateId),
        eq(candidateDocuments.kind, "cv"),
        eq(candidateDocuments.sensitivity, "original")
      )
    );

  await db.insert(candidateDocuments).values({
    id: documentId,
    candidateId: candidate.candidateId,
    kind: "cv",
    sensitivity: "original",
    storageBucket: bucket,
    storagePath,
    fileName: validated.fileName,
    mimeType: validated.mimeType,
    sizeBytes: validated.sizeBytes,
    checksum,
    reviewStatus: "uploaded",
    uploadedByCandidateAccountId: candidate.accountId,
  });

  return { documentId, mimeType: validated.mimeType, fileName: validated.fileName };
}

export async function getCandidateCvAccess(
  actor: { type: "candidate"; user: CandidateUser } | { type: "staff"; user: StaffUser },
  requestedCandidateId: string
) {
  const candidateId = resolveBoundCandidateId(actor, requestedCandidateId);
  if (actor.type === "staff") assertStaffActor(actor.user);

  const storage = getPrivateDocumentStorage();
  if (!storage.isConfigured()) {
    throw new Error("Privater Dokumentenspeicher ist nicht konfiguriert.");
  }

  if (isDemoMode()) {
    const meta = demoMeta().get(candidateId);
    if (!meta) return null;
    const object = await storage.get(meta.storagePath);
    if (!object) return null;
    return { ...meta, body: object.body, contentType: object.contentType };
  }

  const db = getDb();
  const [doc] = await db
    .select()
    .from(candidateDocuments)
    .where(
      and(
        eq(candidateDocuments.candidateId, candidateId),
        eq(candidateDocuments.kind, "cv"),
        eq(candidateDocuments.sensitivity, "original")
      )
    )
    .limit(1);
  if (!doc) return null;
  const object = await storage.get(doc.storagePath);
  if (!object) return null;
  return {
    documentId: doc.id,
    candidateId: doc.candidateId,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    storagePath: doc.storagePath,
    body: object.body,
    contentType: object.contentType,
  };
}
