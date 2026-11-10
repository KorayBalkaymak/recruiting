import "server-only";

import type { PrivateDocumentStorage } from "./types";

export function createUnavailablePrivateStorage(): PrivateDocumentStorage {
  return {
    provider: "unavailable",
    isConfigured: () => false,
    async put() {
      throw new Error(
        "Privater Dokumentenspeicher ist nicht konfiguriert. Bitte B2-Umgebungsvariablen setzen (B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME, B2_ENDPOINT, B2_REGION)."
      );
    },
    async get() {
      throw new Error("Privater Dokumentenspeicher ist nicht konfiguriert.");
    },
    async delete() {
      throw new Error("Privater Dokumentenspeicher ist nicht konfiguriert.");
    },
  };
}
