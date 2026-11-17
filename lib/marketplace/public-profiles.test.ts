import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  matchesPublicMarketplaceFilter,
  publicDisplayName,
  uniqueDesiredRoles,
} from "./public-profiles.ts";

describe("public marketplace listing", () => {
  it("anonymizes last names to an initial", () => {
    assert.equal(publicDisplayName("Clara", "Kandidat"), "Clara K.");
    assert.equal(publicDisplayName("Max", ""), "Max");
  });

  it("filters only by exact desired role and optional search text", () => {
    const backend = {
      desiredRole: "Senior Backend Developer",
      summary: "Node.js und TypeScript",
      skills: ["TypeScript"],
      city: "Köln",
    };
    assert.equal(
      matchesPublicMarketplaceFilter(backend, { beruf: "Senior Backend Developer" }),
      true
    );
    assert.equal(matchesPublicMarketplaceFilter(backend, { beruf: "Controller" }), false);
    assert.equal(matchesPublicMarketplaceFilter(backend, { q: "typescript" }), true);
    assert.equal(matchesPublicMarketplaceFilter(backend, { q: "sap" }), false);
  });

  it("collects unique roles for the filter", () => {
    assert.deepEqual(
      uniqueDesiredRoles([
        {
          displayName: "A",
          desiredRole: "Controller",
          summary: null,
          yearsExperience: null,
          city: null,
          country: null,
          skills: [],
        },
        {
          displayName: "B",
          desiredRole: "controller",
          summary: null,
          yearsExperience: null,
          city: null,
          country: null,
          skills: [],
        },
        {
          displayName: "C",
          desiredRole: "Projektleiterin",
          summary: null,
          yearsExperience: null,
          city: null,
          country: null,
          skills: [],
        },
      ]),
      ["Controller", "Projektleiterin"]
    );
  });
});
