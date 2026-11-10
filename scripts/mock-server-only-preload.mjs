/**
 * Test preload: allow importing server-only modules outside Next.js.
 * Used only by local integration scripts.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Module = require("module");
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  if (request === "next/headers") {
    return {
      cookies: () => ({
        get: () => undefined,
        set: () => undefined,
        delete: () => undefined,
      }),
      headers: () => new Headers(),
    };
  }
  return originalLoad.apply(this, arguments);
};
