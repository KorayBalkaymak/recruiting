import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasB2Config,
  isPlausibleB2Endpoint,
  readB2ConfigFromEnv,
} from "./b2-config.ts";

describe("B2 config", () => {
  it("reports missing keys without exposing secrets", () => {
    const parsed = readB2ConfigFromEnv({
      B2_KEY_ID: "keyId",
      B2_APPLICATION_KEY: "secret-should-not-appear",
      B2_BUCKET_NAME: "",
      B2_ENDPOINT: "",
      B2_REGION: "",
    });
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.deepEqual(parsed.missing, [
        "B2_BUCKET_NAME",
        "B2_ENDPOINT",
        "B2_REGION",
      ]);
      assert.deepEqual(parsed.invalid, []);
      assert.equal(JSON.stringify(parsed).includes("secret-should-not-appear"), false);
    }
  });

  it("rejects non-https endpoints without echoing secrets", () => {
    const parsed = readB2ConfigFromEnv({
      B2_KEY_ID: "keyId",
      B2_APPLICATION_KEY: "secret-should-not-appear",
      B2_BUCKET_NAME: "cms-private",
      B2_ENDPOINT: "http://s3.eu-central-003.backblazeb2.com",
      B2_REGION: "eu-central-003",
    });
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.deepEqual(parsed.invalid, ["B2_ENDPOINT"]);
      assert.equal(JSON.stringify(parsed).includes("secret-should-not-appear"), false);
    }
  });

  it("accepts a complete config", () => {
    const env = {
      B2_KEY_ID: "keyId",
      B2_APPLICATION_KEY: "appKey",
      B2_BUCKET_NAME: "cms-private",
      B2_ENDPOINT: "https://s3.eu-central-003.backblazeb2.com",
      B2_REGION: "eu-central-003",
    };
    assert.equal(hasB2Config(env), true);
    assert.equal(isPlausibleB2Endpoint(env.B2_ENDPOINT), true);
    const parsed = readB2ConfigFromEnv(env);
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.config.bucket, "cms-private");
      assert.equal(parsed.config.region, "eu-central-003");
      assert.equal(parsed.config.keyId, "keyId");
    }
  });
});
