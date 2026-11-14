import https from "node:https";

/** Next.js patches global fetch; Neon HTTP must not go through that path. */
export function resolveNeonFetchUrl(input: unknown): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  if (input && typeof input === "object" && "url" in input) {
    return String((input as { url: unknown }).url ?? "");
  }
  return "";
}

function requestHeaders(headers: RequestInit["headers"] | undefined): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers.map(([key, value]) => [key, value]));
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value == null) continue;
    out[key] = String(value);
  }
  return out;
}

function bodyToBuffer(body: RequestInit["body"]): Buffer {
  if (body == null) return Buffer.alloc(0);
  if (typeof body === "string") return Buffer.from(body);
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  throw new Error("Neon HTTP-Body wird nicht unterstützt.");
}

export function neonNodeFetch(input: unknown, init?: RequestInit): Promise<Response> {
  const url = resolveNeonFetchUrl(input);
  if (!/^https:\/\//i.test(url)) {
    return Promise.reject(new Error("Neon HTTP-Endpoint fehlt oder ist kein https."));
  }

  const target = new URL(url);
  const body = bodyToBuffer(init?.body ?? null);
  const headers = requestHeaders(init?.headers);
  headers["content-length"] = String(body.length);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: "https:",
        hostname: target.hostname,
        port: target.port ? Number(target.port) : 443,
        path: `${target.pathname}${target.search}`,
        method: init?.method ?? "POST",
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on("end", () => {
          const responseHeaders = new Headers();
          for (const [key, value] of Object.entries(res.headers)) {
            if (value == null) continue;
            if (Array.isArray(value)) {
              for (const item of value) responseHeaders.append(key, item);
            } else {
              responseHeaders.set(key, value);
            }
          }
          resolve(
            new Response(Buffer.concat(chunks), {
              status: res.statusCode ?? 500,
              statusText: res.statusMessage,
              headers: responseHeaders,
            })
          );
        });
      }
    );
    req.on("error", reject);
    if (body.length) req.write(body);
    req.end();
  });
}
