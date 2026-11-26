import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catalogTermIsValid,
  qualificationGroups,
  qualificationItems,
  recruitingCategories,
} from "./recruiting-catalog.ts";

describe("recruiting catalog", () => {
  it("exposes the six numbered top categories", () => {
    assert.deepEqual(
      recruitingCategories.map((item) => item.code),
      ["01", "02", "03", "04", "05", "06"]
    );
  });

  it("keeps every selectable label within the term length limit", () => {
    const labels = [
      ...recruitingCategories.flatMap((item) => [...item.positions, ...item.disciplines]),
      ...qualificationItems,
    ];
    for (const label of labels) {
      assert.equal(catalogTermIsValid(label), true, label);
      assert.ok(label.length <= 64, label);
    }
  });

  it("has positions and disciplines for each category", () => {
    for (const category of recruitingCategories) {
      assert.ok(category.positions.length > 0, category.id);
      assert.ok(category.disciplines.includes("Stahlbau"), category.id);
      assert.ok(category.disciplines.includes("Hochbau"), category.id);
    }
  });

  it("groups qualification certificates", () => {
    assert.ok(qualificationGroups.length >= 8);
    assert.ok(qualificationItems.includes("PMP"));
    assert.ok(qualificationItems.includes("VT2"));
  });
});
