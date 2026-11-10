import "server-only";

import type { PrivateDocumentStorage, PrivateObjectGetResult, PrivateObjectPutInput } from "./types";

const globalForMemory = globalThis as unknown as {
  __cmsPrivateDocMemory?: Map<string, { body: Buffer; contentType: string }>;
};

function store() {
  if (!globalForMemory.__cmsPrivateDocMemory) {
    globalForMemory.__cmsPrivateDocMemory = new Map();
  }
  return globalForMemory.__cmsPrivateDocMemory;
}

export function createMemoryPrivateStorage(): PrivateDocumentStorage {
  return {
    provider: "memory",
    isConfigured: () => true,
    async put(input: PrivateObjectPutInput) {
      store().set(input.key, {
        body: Buffer.from(input.body),
        contentType: input.contentType,
      });
    },
    async get(key: string): Promise<PrivateObjectGetResult | null> {
      const hit = store().get(key);
      if (!hit) return null;
      return { body: hit.body, contentType: hit.contentType };
    },
    async delete(key: string) {
      store().delete(key);
    },
  };
}
