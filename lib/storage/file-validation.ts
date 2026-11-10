/**
 * Pure file validation helpers (Node-testable, no server-only).
 * Used by private document uploads before any storage write.
 */

export const CV_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export type CvMimeType = (typeof CV_ALLOWED_MIME_TYPES)[number];

export const CV_MAX_BYTES = 8 * 1024 * 1024;
export const CV_MAX_FILENAME_CHARS = 180;

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
const OLE_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]); // .doc
const ZIP_MAGIC = Buffer.from([0x50, 0x4b]); // PK — ZIP container (.docx OOXML)

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileValidationError";
  }
}

function startsWith(buf: Buffer, magic: Buffer) {
  if (buf.length < magic.length) return false;
  return magic.equals(buf.subarray(0, magic.length));
}

/**
 * OOXML (.docx) is a ZIP that must contain Content_Types and a word/ part.
 * Rejects arbitrary ZIP/malware packages that only share the PK magic.
 */
export function looksLikeDocxZip(buffer: Buffer): boolean {
  if (!startsWith(buffer, ZIP_MAGIC)) return false;
  // Scan a bounded prefix for embedded ZIP local-file names (ASCII).
  const haystack = buffer.subarray(0, Math.min(buffer.length, 512 * 1024)).toString("latin1");
  const hasContentTypes = haystack.includes("[Content_Types].xml");
  const hasWordPart = haystack.includes("word/");
  return hasContentTypes && hasWordPart;
}

/** Detect CV content type from magic bytes (+ OOXML structure for docx). */
export function detectCvMimeFromBuffer(buffer: Buffer): CvMimeType | null {
  if (startsWith(buffer, PDF_MAGIC)) return "application/pdf";
  if (startsWith(buffer, OLE_MAGIC)) return "application/msword";
  if (looksLikeDocxZip(buffer)) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return null;
}

/**
 * Sanitize upload filenames: strip paths, control chars, and separators.
 * Never used as a storage key — only for Content-Disposition / DB display.
 */
export function sanitizeUploadFileName(raw: string): string {
  const base = raw.replace(/\\/g, "/").split("/").pop() ?? "";
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>:"|?*]/g, "_")
    .trim();
  if (!cleaned || cleaned === "." || cleaned === "..") {
    throw new FileValidationError("Ungültiger Dateiname.");
  }
  if (cleaned.length > CV_MAX_FILENAME_CHARS) {
    const extMatch = cleaned.match(/(\.[A-Za-z0-9]{1,12})$/);
    const ext = extMatch?.[1] ?? "";
    const stem = cleaned.slice(0, Math.max(1, CV_MAX_FILENAME_CHARS - ext.length));
    return `${stem}${ext}`;
  }
  return cleaned;
}

export function assertSafeCvUpload(input: {
  mimeType: string;
  sizeBytes: number;
  fileName: string;
  buffer: Buffer;
}): { mimeType: CvMimeType; fileName: string; sizeBytes: number } {
  if (input.sizeBytes <= 0 || input.sizeBytes > CV_MAX_BYTES) {
    throw new FileValidationError("Datei ist zu groß oder leer (max. 8 MB).");
  }
  if (input.buffer.length !== input.sizeBytes) {
    throw new FileValidationError("Dateigröße stimmt nicht mit dem Inhalt überein.");
  }

  const fileName = sanitizeUploadFileName(input.fileName);
  const detected = detectCvMimeFromBuffer(input.buffer);
  if (!detected) {
    throw new FileValidationError("Dateityp nicht erkannt. Nur PDF- oder Word-Dateien sind erlaubt.");
  }

  const claimed = input.mimeType.trim().toLowerCase();
  const claimedOk =
    claimed === detected ||
    claimed === "application/octet-stream" ||
    // Browsers sometimes send empty type
    claimed === "";

  if (!claimedOk && !CV_ALLOWED_MIME_TYPES.includes(claimed as CvMimeType)) {
    throw new FileValidationError("Nur PDF- oder Word-Dateien sind erlaubt.");
  }
  // If browser claimed a different allowed type than magic bytes, trust content.
  if (
    claimed &&
    claimed !== "application/octet-stream" &&
    CV_ALLOWED_MIME_TYPES.includes(claimed as CvMimeType) &&
    claimed !== detected
  ) {
    throw new FileValidationError("Dateityp stimmt nicht mit dem Dateiinhalt überein.");
  }

  return { mimeType: detected, fileName, sizeBytes: input.sizeBytes };
}

export function buildPrivateStorageKey(parts: { candidateId: string; documentId: string }) {
  // UUIDs only in path segments — never user-controlled filenames.
  return `candidates/${parts.candidateId}/cv/${parts.documentId}`;
}

export function contentDispositionAttachment(fileName: string) {
  const safe = sanitizeUploadFileName(fileName).replace(/"/g, "");
  return `attachment; filename="${safe}"`;
}
