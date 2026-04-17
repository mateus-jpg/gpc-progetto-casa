import { beforeEach, describe, expect, it, vi } from "vitest";
import { arraysIntersect } from "@/utils/database";

// Note: getUserDocument and collections are harder to test without mocking Firebase Admin
// So we focus on pure utility functions here

describe("arraysIntersect", () => {
  it("should return true when arrays have common elements", () => {
    expect(arraysIntersect(["a", "b", "c"], ["c", "d", "e"])).toBe(true);
  });

  it("should return false when arrays have no common elements", () => {
    expect(arraysIntersect(["a", "b", "c"], ["d", "e", "f"])).toBe(false);
  });

  it("should return false for empty arrays", () => {
    expect(arraysIntersect([], [])).toBe(false);
    expect(arraysIntersect(["a"], [])).toBe(false);
    expect(arraysIntersect([], ["a"])).toBe(false);
  });

  it("should handle null/undefined arrays", () => {
    expect(arraysIntersect(null, ["a"])).toBe(false);
    expect(arraysIntersect(["a"], null)).toBe(false);
    expect(arraysIntersect(undefined, ["a"])).toBe(false);
    expect(arraysIntersect(["a"], undefined)).toBe(false);
    expect(arraysIntersect(null, null)).toBe(false);
  });

  it("should return true when arrays are identical", () => {
    expect(arraysIntersect(["a", "b"], ["a", "b"])).toBe(true);
  });

  it("should return true when one array is subset of another", () => {
    expect(arraysIntersect(["a", "b", "c"], ["b"])).toBe(true);
    expect(arraysIntersect(["b"], ["a", "b", "c"])).toBe(true);
  });

  it("should work with structure IDs", () => {
    const userStructures = ["structure-1", "structure-2", "structure-3"];
    const allowedStructures = ["structure-2", "structure-5"];
    expect(arraysIntersect(userStructures, allowedStructures)).toBe(true);
  });

  it("should return false when user has no matching structures", () => {
    const userStructures = ["structure-1", "structure-2"];
    const allowedStructures = ["structure-5", "structure-6"];
    expect(arraysIntersect(userStructures, allowedStructures)).toBe(false);
  });
});
