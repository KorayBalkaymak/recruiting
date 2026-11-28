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

export type OriginalDocumentKind = "cv" | "certificate";

type DemoDocMeta = {
  documentId: string;
  candidateId: string;
  accountId: string;
  kind: OriginalDocumentKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
};

const globalDemoMeta = globalThis as unknown as {
  __cmsDemoOriginalDocs?: Map<string, DemoDocMeta>;
};

function demoKey(candidateId: string, kind: OriginalDocumentKind) {
  return `${candidateId}:${kind}`;
}

function demoMeta() {
  if (!globalDemoMeta.__cmsDemoOriginalDocs) globalDemoMeta.__cmsDemoOriginalDocs = new Map();
  return globalDemoMeta.__cmsDemoOriginalDocs;
}

export function demoHasOriginalDocument(candidateId: string, kind: OriginalDocumentKind) {
  return demoMeta().has(demoKey(candidateId, kind));
}

export function demoHasOriginalCv(candidateId: string) {
  return demoHasOriginalDocument(candidateId, "cv");
}

export function demoHasOriginalCertificate(candidateId: string) {
  return demoHasOriginalDocument(candidateId, "certificate");
}

export async function getOwnOriginalDocumentMeta(
  candidate: CandidateUser,
  kind: OriginalDocumentKind
) {
  assertCandidateActor(candidate);
  if (isDemoMode()) {
    const meta = demoMeta().get(demoKey(candidate.candidateId, kind));
    return meta ? { fileName: meta.fileName } : null;
  }

  const db = getDb();
  const [doc] = await db
    .select({ fileName: candidateDocuments.fileName })
    .from(candidateDocuments)
    .where(
      and(
        eq(candidateDocuments.candidateId, candidate.candidateId),
        eq(candidateDocuments.kind, kind),
        eq(candidateDocuments.sensitivity, "original")
      )
    )
    .limit(1);
  return doc ? { fileName: doc.fileName } : null;
}

export async function getOwnCandidateCvMeta(candidate: CandidateUser) {
  return getOwnOriginalDocumentMeta(candidate, "cv");
}

export async function getOwnCandidateCertificateMeta(candidate: CandidateUser) {
  return getOwnOriginalDocumentMeta(candidate, "certificate");
}

export async function getStaffOriginalDocumentMeta(
  staff: StaffUser,
  candidateId: string,
  kind: OriginalDocumentKind
) {
  assertStaffActor(staff);
  if (!candidateId.trim()) return null;
  if (isDemoMode()) {
    const meta = demoMeta().get(demoKey(candidateId, kind));
    return meta ? { fileName: meta.fileName, mimeType: meta.mimeType } : null;
  }
  const db = getDb();
  const [doc] = await db
    .select({
      fileName: candidateDocuments.fileName,
      mimeType: candidateDocuments.mimeType,
    })
    .from(candidateDocuments)
    .where(
      and(
        eq(candidateDocuments.candidateId, candidateId),
        eq(candidateDocuments.kind, kind),
        eq(candidateDocuments.sensitivity, "original")
      )
    )
    .limit(1);
  return doc ?? null;
}

export async function assertRequiredCandidateUploads(candidate: CandidateUser) {
  const [cv, certificate] = await Promise.all([
    getOwnOriginalDocumentMeta(candidate, "cv"),
    getOwnOriginalDocumentMeta(candidate, "certificate"),
  ]);
  if (!cv?.fileName) {
    throw new Error("Lebenslauf ist ein Pflichtfeld. Bitte zuerst hochladen.");
  }
  if (!certificate?.fileName) {
    throw new Error("Qualifikationen sind ein Pflichtfeld. Bitte zuerst hochladen.");
  }
}

function sha256Hex(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function uploadOriginalDocument(
  candidate: CandidateUser,
  kind: OriginalDocumentKind,
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
      "Upload ist noch nicht konfiguriert (privater Storage fehlt). Bitte B2-Umgebungsvariablen setzen."
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
    demoMeta().set(demoKey(candidate.candidateId, kind), {
      documentId,
      candidateId: candidate.candidateId,
      accountId: candidate.accountId,
      kind,
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
        eq(candidateDocuments.kind, kind),
        eq(candidateDocuments.sensitivity, "original")
      )
    );

  await db.insert(candidateDocuments).values({
    id: documentId,
    candidateId: candidate.candidateId,
    kind,
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

export async function uploadCandidateCv(
  candidate: CandidateUser,
  file: { buffer: Buffer; mimeType: string; fileName: string; sizeBytes: number }
) {
  return uploadOriginalDocument(candidate, "cv", file);
}

export async function getOriginalDocumentAccess(
  actor: { type: "candidate"; user: CandidateUser } | { type: "staff"; user: StaffUser },
  requestedCandidateId: string,
  kind: OriginalDocumentKind
) {
  const candidateId = resolveBoundCandidateId(actor, requestedCandidateId);
  if (actor.type === "staff") assertStaffActor(actor.user);

  const storage = getPrivateDocumentStorage();
  if (!storage.isConfigured()) {
    throw new Error("Privater Dokumentenspeicher ist nicht konfiguriert.");
  }

  if (isDemoMode()) {
    const meta = demoMeta().get(demoKey(candidateId, kind));
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
        eq(candidateDocuments.kind, kind),
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

export async function getCandidateCvAccess(
  actor: { type: "candidate"; user: CandidateUser } | { type: "staff"; user: StaffUser },
  requestedCandidateId: string
) {
  return getOriginalDocumentAccess(actor, requestedCandidateId, "cv");
}
