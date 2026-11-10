export type PrivateObjectPutInput = {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
};

export type PrivateObjectGetResult = {
  body: Buffer;
  contentType: string;
};

export type PrivateStorageProvider = "memory" | "b2" | "r2" | "unavailable";

export interface PrivateDocumentStorage {
  readonly provider: PrivateStorageProvider;
  isConfigured(): boolean;
  put(input: PrivateObjectPutInput): Promise<void>;
  get(key: string): Promise<PrivateObjectGetResult | null>;
  delete(key: string): Promise<void>;
}
