import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { APIError } from "better-auth";
import { toSafeAuthMessage } from "./auth-messages.ts";

describe("toSafeAuthMessage", () => {
  it("maps invalid credentials without echoing internals", () => {
    const error = APIError.from("UNAUTHORIZED", {
      message: "invalid",
      code: "INVALID_EMAIL_OR_PASSWORD",
    });
    assert.equal(toSafeAuthMessage(error), "Ungültige Anmeldedaten.");
  });

  it("maps origin failures to a config hint", () => {
    const error = APIError.from("FORBIDDEN", {
      message: "origin",
      code: "INVALID_ORIGIN",
    });
    assert.match(toSafeAuthMessage(error), /BETTER_AUTH_URL/);
  });

  it("keeps AuthError copy", () => {
    const error = Object.assign(new Error("x"), { name: "AuthError", code: "UNAUTHENTICATED" });
    assert.equal(toSafeAuthMessage(error), "Anmeldung erforderlich.");
  });
});
