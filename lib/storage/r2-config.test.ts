import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasR2Config,
  isPlausibleR2Endpoint,
  readR2ConfigFromEnv,
} from "./r2-config.ts";

describe("R2 config (BA5)", () => {
  it("reports missing keys without exposing secrets", () => {
    const parsed = readR2ConfigFromEnv({
      R2_ACCOUNT_ID: "acc",
      R2_ACCESS_KEY_ID: "",
      R2_SECRET_ACCESS_KEY: "secret-should-not-appear",
      R2_BUCKET: "bucket",
      R2_ENDPOINT: "",
    });
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.deepEqual(parsed.missing, ["R2_ACCESS_KEY_ID", "R2_ENDPOINT"]);
      assert.deepEqual(parsed.invalid, []);
      assert.equal(JSON.stringify(parsed).includes("secret-should-not-appear"), false);
    }
  });

  it("rejects non-https endpoints without echoing secrets", () => {
    const parsed = readR2ConfigFromEnv({
      R2_ACCOUNT_ID: "acc",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret-should-not-appear",
      R2_BUCKET: "cms-private",
      R2_ENDPOINT: "http://acc.r2.cloudflarestorage.com",
    });
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.deepEqual(parsed.invalid, ["R2_ENDPOINT"]);
      assert.equal(JSON.stringify(parsed).includes("secret-should-not-appear"), false);
    }
  });

  it("accepts a complete config", () => {
    const env = {
      R2_ACCOUNT_ID: "acc",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_BUCKET: "cms-private",
      R2_ENDPOINT: "https://acc.r2.cloudflarestorage.com",
      R2_REGION: "auto",
    };
    assert.equal(hasR2Config(env), true);
    assert.equal(isPlausibleR2Endpoint(env.R2_ENDPOINT), true);
    const parsed = readR2ConfigFromEnv(env);
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.config.bucket, "cms-private");
      assert.equal(parsed.config.region, "auto");
    }
  });
});
