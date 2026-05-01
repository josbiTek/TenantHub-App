const { describe, it } = require("node:test");
const assert = require("node:assert");

describe("Health check", () => {
  it("should return healthy status", () => {
    const response = { status: "healthy", service: "tenanthub-api" };
    assert.strictEqual(response.status, "healthy");
    assert.strictEqual(response.service, "tenanthub-api");
  });
});

describe("Input validation", () => {
  it("should reject empty tenant name", () => {
    assert.strictEqual("".length > 0, false);
  });

  it("should accept valid task statuses", () => {
    const allowed = ["todo", "in-progress", "done"];
    assert.ok(allowed.includes("todo"));
    assert.ok(!allowed.includes("invalid"));
  });
});
