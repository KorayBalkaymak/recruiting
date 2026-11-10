import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertSafeCvUpload,
  buildPrivateStorageKey,
  contentDispositionAttachment,
  detectCvMimeFromBuffer,
  FileValidationError,
  sanitizeUploadFileName,
} from "./file-validation.ts";

function pdfBuffer(extra = "") {
  return Buffer.from(`%PDF-1.4\n${extra}\n%%EOF`);
}

function oleDocBuffer() {
  return Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x01]);
}

function zipDocxBuffer() {
  // Minimal ZIP-like payload that includes required OOXML markers in the prefix.
  return Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    Buffer.from("[Content_Types].xml\0word/document.xml"),
  ]);
}

function zipJunkBuffer() {
  return Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("not-ooxml")]);
}

describe("CV file validation (BA5)", () => {
  it("detects pdf/doc/docx magic bytes", () => {
    assert.equal(detectCvMimeFromBuffer(pdfBuffer()), "application/pdf");
    assert.equal(detectCvMimeFromBuffer(oleDocBuffer()), "application/msword");
    assert.equal(
      detectCvMimeFromBuffer(zipDocxBuffer()),
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    assert.equal(detectCvMimeFromBuffer(zipJunkBuffer()), null);
    assert.equal(detectCvMimeFromBuffer(Buffer.from("not-a-file")), null);
  });

  it("sanitizes dangerous filenames", () => {
    assert.equal(sanitizeUploadFileName("../../etc/passwd.pdf"), "passwd.pdf");
    assert.equal(sanitizeUploadFileName("a\\b\\cv.pdf"), "cv.pdf");
    assert.equal(sanitizeUploadFileName('report"\r\n.pdf'), "report_.pdf");
    assert.throws(() => sanitizeUploadFileName(".."), FileValidationError);
  });

  it("accepts valid pdf upload and returns detected mime", () => {
    const buffer = pdfBuffer();
    const result = assertSafeCvUpload({
      mimeType: "application/pdf",
      sizeBytes: buffer.length,
      fileName: "Mein Lebenslauf.pdf",
      buffer,
    });
    assert.equal(result.mimeType, "application/pdf");
    assert.equal(result.fileName, "Mein Lebenslauf.pdf");
  });

  it("rejects mismatched claimed mime vs content", () => {
    const buffer = pdfBuffer();
    assert.throws(
      () =>
        assertSafeCvUpload({
          mimeType: "application/msword",
          sizeBytes: buffer.length,
          fileName: "cv.doc",
          buffer,
        }),
      FileValidationError
    );
  });

  it("rejects empty/oversized/unknown content", () => {
    assert.throws(
      () =>
        assertSafeCvUpload({
          mimeType: "application/pdf",
          sizeBytes: 0,
          fileName: "a.pdf",
          buffer: Buffer.alloc(0),
        }),
      FileValidationError
    );
    const junk = Buffer.from("hello world");
    assert.throws(
      () =>
        assertSafeCvUpload({
          mimeType: "application/pdf",
          sizeBytes: junk.length,
          fileName: "a.pdf",
          buffer: junk,
        }),
      FileValidationError
    );
  });

  it("builds opaque storage keys without user filenames", () => {
    const key = buildPrivateStorageKey({
      candidateId: "11111111-1111-1111-1111-111111111111",
      documentId: "22222222-2222-2222-2222-222222222222",
    });
    assert.equal(
      key,
      "candidates/11111111-1111-1111-1111-111111111111/cv/22222222-2222-2222-2222-222222222222"
    );
    assert.equal(
      contentDispositionAttachment('evil"name.pdf'),
      'attachment; filename="evil_name.pdf"'
    );
  });
});
