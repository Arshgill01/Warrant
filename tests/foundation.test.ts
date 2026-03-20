import { describe, expect, it } from "vitest";
import { foundationBoundaries } from "../src/demo-fixtures/foundation";

describe("foundation boundaries", () => {
  it("keeps keys unique for worktree coordination", () => {
    const keys = foundationBoundaries.map((boundary) => boundary.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("covers the core demo-first product boundaries", () => {
    expect(foundationBoundaries.map((boundary) => boundary.key)).toEqual(
      expect.arrayContaining([
        "auth",
        "connections",
        "warrants",
        "agents",
        "approvals",
        "graph",
        "audit",
        "demo-fixtures",
        "contracts",
      ]),
    );
  });
});
