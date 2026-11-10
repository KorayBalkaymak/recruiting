import { NextResponse } from "next/server";
import { requireCandidate, toAuthHttpError } from "@/lib/auth";
import { getCandidateCvAccess, uploadCandidateCv } from "@/lib/candidate/cv-upload";
import { contentDispositionAttachment, FileValidationError } from "@/lib/storage/private-documents";

export async function POST(request: Request) {
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
    const result = await uploadCandidateCv(candidate, {
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

/** Candidate self-download only — bound to session candidateId (no client ID). */
export async function GET() {
  try {
    const candidate = await requireCandidate();
    const file = await getCandidateCvAccess(
      { type: "candidate", user: candidate },
      candidate.candidateId
    );
    if (!file) {
      return NextResponse.json({ error: "Kein CV vorhanden." }, { status: 404 });
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
