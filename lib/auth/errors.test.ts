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

  it("maps a missing Better Auth secret without calling it a URL mismatch", () => {
    assert.match(
      toSafeAuthMessage(new Error("BETTER_AUTH_SECRET fehlt oder ist zu kurz (mind. 32 Zeichen).")),
      /BETTER_AUTH_SECRET fehlt/
    );
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

  it("does not treat a bare Invalid URL as a DATABASE_URL quote problem", () => {
    const copy = toSafeAuthMessage(new Error("TypeError: Invalid URL"), {
      present: true,
      wrapper: "none",
      schemeOk: true,
      neonParseOk: true,
    });
    assert.match(copy, /Auth-URL ungültig/);
    assert.doesNotMatch(copy, /Anführungszeichen/);
  });

  it("maps nested Invalid URL causes without blaming quotes when the URL is valid", () => {
    const nested = Object.assign(new Error("Failed query: select 1"), {
      cause: new Error("TypeError: Invalid URL"),
    });
    const copy = toSafeAuthMessage(nested, {
      present: true,
      wrapper: "none",
      schemeOk: true,
      neonParseOk: true,
    });
    assert.match(copy, /Datenbankabfrage fehlgeschlagen/);
    assert.doesNotMatch(copy, /Anführungszeichen setzen/);
  });

  it("tells operators when no DATABASE_URL is set", () => {
    assert.match(
      toSafeAuthMessage(new Error("Keine Datenbank-URL gesetzt. Erwartet eine von: DATABASE_URL."), {
        present: false,
        wrapper: "none",
        schemeOk: false,
        neonParseOk: false,
      }),
      /Keine DATABASE_URL/
    );
  });
});
