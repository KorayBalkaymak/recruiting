import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkRateLimit,
  createMemoryRateLimitBackend,
  createMemoryRateLimitStore,
  createRedisRateLimitBackend,
  describeRateLimitStatus,
  enforceRateLimit,
  rateLimitKey,
  readRateLimitBackendConfig,
  resetRateLimitBackendCache,
} from "./rate-limit.ts";

describe("rate limit (BA6.2)", () => {
  it("allows requests under the max and then blocks", () => {
    const store = createMemoryRateLimitStore();
    const key = rateLimitKey({ action: "login", ip: "1.2.3.4", email: "a@example.com" });

    for (let i = 0; i < 3; i++) {
      const result = checkRateLimit(key, { windowMs: 60_000, max: 3, now: 1_000 + i }, store);
      assert.equal(result.ok, true);
    }

    const blocked = checkRateLimit(key, { windowMs: 60_000, max: 3, now: 1_010 }, store);
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.ok(blocked.retryAfterSeconds >= 1);
  });

  it("resets after the window elapses", () => {
    const store = createMemoryRateLimitStore();
    const key = "register:9.9.9.9:b@example.com";
    assert.equal(checkRateLimit(key, { windowMs: 1000, max: 1, now: 0 }, store).ok, true);
    assert.equal(checkRateLimit(key, { windowMs: 1000, max: 1, now: 500 }, store).ok, false);
    assert.equal(checkRateLimit(key, { windowMs: 1000, max: 1, now: 1001 }, store).ok, true);
  });

  it("isolates keys by action/ip/email", () => {
    const store = createMemoryRateLimitStore();
    assert.equal(
      checkRateLimit("login:1:a", { windowMs: 1000, max: 1, now: 0 }, store).ok,
      true
    );
    assert.equal(
      checkRateLimit("login:1:b", { windowMs: 1000, max: 1, now: 0 }, store).ok,
      true
    );
  });

  it("memory backend matches sync helper via enforceRateLimit façade", async () => {
    resetRateLimitBackendCache();
    const key = rateLimitKey({
      action: "façade",
      ip: "127.0.0.1",
      email: `u-${Date.now()}@example.com`,
    });
    const first = await enforceRateLimit(key, { windowMs: 60_000, max: 1 });
    assert.equal(first.ok, true);
    const second = await enforceRateLimit(key, { windowMs: 60_000, max: 1 });
    assert.equal(second.ok, false);
  });

  it("reads backend config without inventing redis secrets", () => {
    assert.deepEqual(readRateLimitBackendConfig({}), {
      mode: "memory",
      redisUrlConfigured: false,
    });
    assert.deepEqual(
      readRateLimitBackendConfig({
        RATE_LIMIT_BACKEND: "redis",
        REDIS_URL: "",
      }),
      { mode: "redis", redisUrlConfigured: false }
    );
    const withUrl = readRateLimitBackendConfig({
      RATE_LIMIT_BACKEND: "redis",
      REDIS_URL: "redis://localhost:6379",
    });
    assert.equal(withUrl.mode, "redis");
    assert.equal(withUrl.redisUrlConfigured, true);
    assert.equal(JSON.stringify(withUrl).includes("redis://"), false);
  });

  it("redis placeholder backend refuses consume until wired", async () => {
    const redis = createRedisRateLimitBackend({ url: "redis://example.invalid" });
    assert.equal(redis.name, "redis");
    await assert.rejects(() => redis.consume("k", { windowMs: 1000, max: 1 }), /not wired/i);
  });

  it("describeRateLimitStatus reports memory as active today", () => {
    resetRateLimitBackendCache();
    const status = describeRateLimitStatus({ RATE_LIMIT_BACKEND: "memory" });
    assert.equal(status.activeBackend, "memory");
    assert.equal(status.multiInstanceReady, false);
    const mem = createMemoryRateLimitBackend();
    assert.equal(mem.name, "memory");
  });
});
