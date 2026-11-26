import { NextResponse } from "next/server";
import { requireCandidate, requireStaff, toAuthHttpError } from "@/lib/auth";
import {
  getOriginalDocumentAccess,
  uploadOriginalDocument,
  type OriginalDocumentKind,
} from "@/lib/candidate/cv-upload";
import { contentDispositionAttachment, FileValidationError } from "@/lib/storage/private-documents";

const missingLabel: Record<OriginalDocumentKind, string> = {
  cv: "Kein Lebenslauf vorhanden.",
  certificate: "Keine Qualifikationen vorhanden.",
};

export async function handleCandidateOriginalDocumentPost(
  request: Request,
  kind: OriginalDocumentKind
) {
  try {
    const candidate = await requireCandidate();
    const { RATE_LIMITS, enforceRateLimit, clientIpFromHeaders, rateLimitKey } = await import(
      "@/lib/security/rate-limit"
    );
    const uploadLimit = await enforceRateLimit(
      rateLimitKey({
        action: "cv_upload",
        ip: clientIpFromHeaders(request.headers),
        email: candidate.email,
      }),
      RATE_LIMITS.cvUpload
    );
    if (!uploadLimit.ok) {
      return NextResponse.json(
        { error: "Zu viele Uploads. Bitte später erneut versuchen." },
        {
          status: 429,
          headers: { "Retry-After": String(uploadLimit.retryAfterSeconds) },
        }
      );
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Keine Datei übermittelt." }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadOriginalDocument(candidate, kind, {
      buffer,
      mimeType: file.type || "application/octet-stream",
      fileName: file.name,
      sizeBytes: file.size,
    });
    return NextResponse.json({
      ok: true,
      documentId: result.documentId,
      mimeType: result.mimeType,
      fileName: result.fileName,
    });
  } catch (error) {
    const authError = toAuthHttpError(error);
    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: authError.code === "UNAUTHENTICATED" ? 401 : 403 }
      );
    }
    if (error instanceof FileValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload fehlgeschlagen." },
      { status: 400 }
    );
  }
}

export async function handleCandidateOriginalDocumentGet(kind: OriginalDocumentKind) {
  try {
    const candidate = await requireCandidate();
    const file = await getOriginalDocumentAccess(
      { type: "candidate", user: candidate },
      candidate.candidateId,
      kind
    );
    if (!file) {
      return NextResponse.json({ error: missingLabel[kind] }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(file.body), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": contentDispositionAttachment(file.fileName),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const authError = toAuthHttpError(error);
    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: authError.code === "UNAUTHENTICATED" ? 401 : 403 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Download fehlgeschlagen." },
      { status: 400 }
    );
  }
}

export async function handleStaffOriginalDocumentGet(
  candidateId: string,
  kind: OriginalDocumentKind
) {
  try {
    const staff = await requireStaff();
    const file = await getOriginalDocumentAccess({ type: "staff", user: staff }, candidateId, kind);
    if (!file) {
      return NextResponse.json({ error: missingLabel[kind] }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(file.body), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": contentDispositionAttachment(file.fileName),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const authError = toAuthHttpError(error);
    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: authError.code === "UNAUTHENTICATED" ? 401 : 403 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Download fehlgeschlagen." },
      { status: 400 }
    );
  }
}
