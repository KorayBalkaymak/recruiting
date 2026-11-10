/**
 * Shared rate-limit façade for auth/abuse-sensitive endpoints.
 *
 * Callers use `enforceRateLimit()` only. Backends implement `RateLimitBackend`.
 * Today: in-memory (single process). Later: Redis via same interface — no call-site changes.
 * No Redis credentials are invented; REDIS_URL is optional/documented only.
 */

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSeconds: number };

export type RateLimitOptions = {
  windowMs: number;
  max: number;
  now?: number;
};

export type RateLimitBucket = number[];

export type RateLimitBackend = {
  readonly name: "memory" | "redis";
  consume(key: string, options: RateLimitOptions): Promise<RateLimitResult>;
};

export type SyncRateLimitStore = {
  get(key: string): RateLimitBucket | undefined;
  set(key: string, timestamps: RateLimitBucket): void;
};

export type RateLimitBackendMode = "memory" | "redis";

export function createMemoryRateLimitStore(): SyncRateLimitStore {
  const map = new Map<string, RateLimitBucket>();
  return {
    get(key) {
      return map.get(key);
    },
    set(key, timestamps) {
      map.set(key, timestamps);
    },
  };
}

/** Pure sliding-window consume against an injectable store (unit-testable). */
export function consumeRateLimitSync(
  store: SyncRateLimitStore,
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = options.now ?? Date.now();
  const windowStart = now - options.windowMs;
  const previous = store.get(key) ?? [];
  const active = previous.filter((ts) => ts > windowStart);

  if (active.length >= options.max) {
    const oldest = active[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + options.windowMs - now) / 1000));
    store.set(key, active);
    return { ok: false, retryAfterSeconds };
  }

  active.push(now);
  store.set(key, active);
  return { ok: true, remaining: Math.max(0, options.max - active.length) };
}

export function createMemoryRateLimitBackend(
  store: SyncRateLimitStore = createMemoryRateLimitStore()
): RateLimitBackend {
  return {
    name: "memory",
    async consume(key, options) {
      return consumeRateLimitSync(store, key, options);
    },
  };
}

/**
 * Redis backend placeholder.
 * Wire a real client here later; callers keep using `enforceRateLimit`.
 */
export function createRedisRateLimitBackend(_config: {
  url: string;
}): RateLimitBackend {
  return {
    name: "redis",
    async consume() {
      throw new Error(
        "Redis rate-limit backend is prepared but not wired yet. Set RATE_LIMIT_BACKEND=memory or implement Redis consume()."
      );
    },
  };
}

export function readRateLimitBackendConfig(
  env: NodeJS.ProcessEnv = process.env
): {
  mode: RateLimitBackendMode;
  redisUrlConfigured: boolean;
} {
  const raw = (env.RATE_LIMIT_BACKEND ?? "memory").trim().toLowerCase();
  const mode: RateLimitBackendMode = raw === "redis" ? "redis" : "memory";
  const redisUrlConfigured = Boolean(env.REDIS_URL?.trim());
  return { mode, redisUrlConfigured };
}

const sharedMemoryStore = createMemoryRateLimitStore();
let cachedBackend: RateLimitBackend | null = null;

/**
 * Resolves the active backend.
 * - memory (default)
 * - redis without REDIS_URL / without wired client: safe fallback to memory + warning
 */
export function getRateLimitBackend(
  env: NodeJS.ProcessEnv = process.env
): RateLimitBackend {
  if (cachedBackend && env === process.env) return cachedBackend;

  const { mode } = readRateLimitBackendConfig(env);

  if (mode === "redis") {
    const url = env.REDIS_URL?.trim() ?? "";
    if (!url) {
      console.warn(
        "[rate-limit] RATE_LIMIT_BACKEND=redis but REDIS_URL is missing; using memory backend."
      );
    } else {
      console.warn(
        "[rate-limit] Redis backend selected and REDIS_URL is set, but Redis consume() is not wired yet; using memory until implemented."
      );
      void createRedisRateLimitBackend({ url });
    }
    const backend = createMemoryRateLimitBackend(sharedMemoryStore);
    if (env === process.env) cachedBackend = backend;
    return backend;
  }

  const backend = createMemoryRateLimitBackend(sharedMemoryStore);
  if (env === process.env) cachedBackend = backend;
  return backend;
}

/** Test helper — clears the process-level backend cache. */
export function resetRateLimitBackendCache() {
  cachedBackend = null;
}

/**
 * Stable async API for app routes/actions.
 * Swap backends via env / getRateLimitBackend without changing call sites.
 */
export async function enforceRateLimit(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  return getRateLimitBackend().consume(key, options);
}

/**
 * Sync helper for unit tests with an injected store.
 * Prefer `enforceRateLimit` in application code.
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions,
  store: SyncRateLimitStore = sharedMemoryStore
): RateLimitResult {
  return consumeRateLimitSync(store, key, options);
}

/** Presets for auth-adjacent actions (conservative defaults). */
export const RATE_LIMITS = {
  login: { windowMs: 15 * 60 * 1000, max: 20 },
  register: { windowMs: 60 * 60 * 1000, max: 10 },
  passwordReset: { windowMs: 60 * 60 * 1000, max: 5 },
  cvUpload: { windowMs: 60 * 60 * 1000, max: 20 },
  authApi: { windowMs: 15 * 60 * 1000, max: 40 },
} as const;

export function clientIpFromHeaders(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const realIp = headerList.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 128);
  return "unknown";
}

export function rateLimitKey(parts: { action: string; ip: string; email?: string }) {
  const email = parts.email?.trim().toLowerCase() || "-";
  return `${parts.action}:${parts.ip}:${email}`;
}

export function describeRateLimitStatus(env: NodeJS.ProcessEnv = process.env): {
  configuredBackend: RateLimitBackendMode;
  activeBackend: "memory" | "redis";
  redisUrlConfigured: boolean;
  multiInstanceReady: boolean;
} {
  const cfg = readRateLimitBackendConfig(env);
  const active = getRateLimitBackend(env);
  return {
    configuredBackend: cfg.mode,
    activeBackend: active.name,
    redisUrlConfigured: cfg.redisUrlConfigured,
    multiInstanceReady: cfg.mode === "redis" && cfg.redisUrlConfigured && active.name === "redis",
  };
}
