import { describe, expect, it } from "vitest";
import { cn, serializeFirestoreData } from "@/lib/utils";

describe("cn (className utility)", () => {
  it("should merge class names", () => {
    const result = cn("class1", "class2");
    expect(result).toBe("class1 class2");
  });

  it("should handle conditional classes", () => {
    const result = cn("base", true && "included", false && "excluded");
    expect(result).toBe("base included");
  });

  it("should merge tailwind classes correctly", () => {
    const result = cn("px-4 py-2", "px-6");
    expect(result).toBe("py-2 px-6");
  });

  it("should handle undefined and null", () => {
    const result = cn("base", undefined, null, "end");
    expect(result).toBe("base end");
  });

  it("should handle empty input", () => {
    const result = cn();
    expect(result).toBe("");
  });
});

describe("serializeFirestoreData", () => {
  it("should return null for null input", () => {
    expect(serializeFirestoreData(null)).toBeNull();
  });

  it("should return undefined for undefined input", () => {
    expect(serializeFirestoreData(undefined)).toBeNull();
  });

  it("should pass through primitive values", () => {
    expect(serializeFirestoreData("string")).toBe("string");
    expect(serializeFirestoreData(123)).toBe(123);
    expect(serializeFirestoreData(true)).toBe(true);
  });

  it("should serialize arrays", () => {
    const input = ["a", "b", "c"];
    const result = serializeFirestoreData(input);
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("should serialize plain objects", () => {
    const input = { name: "Test", value: 123 };
    const result = serializeFirestoreData(input);
    expect(result).toEqual({ name: "Test", value: 123 });
  });

  it("should serialize nested objects", () => {
    const input = {
      user: {
        name: "Test",
        details: {
          age: 30,
        },
      },
    };
    const result = serializeFirestoreData(input);
    expect(result).toEqual({
      user: {
        name: "Test",
        details: {
          age: 30,
        },
      },
    });
  });

  it("should convert Firestore Timestamp-like objects with toDate method", () => {
    const mockTimestamp = {
      toDate: () => new Date("2024-01-15T10:30:00Z"),
    };
    const result = serializeFirestoreData(mockTimestamp);
    expect(result).toBe("2024-01-15T10:30:00.000Z");
  });

  it("should convert Firestore Timestamp-like objects with _seconds and _nanoseconds", () => {
    const mockTimestamp = {
      _seconds: 1705315800,
      _nanoseconds: 0,
    };
    const result = serializeFirestoreData(mockTimestamp);
    expect(typeof result).toBe("string");
    expect(result).toContain("2024");
  });

  it("should handle arrays with timestamps", () => {
    const input = [
      { toDate: () => new Date("2024-01-15T10:30:00Z") },
      "string value",
    ];
    const result = serializeFirestoreData(input);
    expect(result[0]).toBe("2024-01-15T10:30:00.000Z");
    expect(result[1]).toBe("string value");
  });

  it("should handle objects with timestamp fields", () => {
    const input = {
      name: "Test",
      createdAt: { toDate: () => new Date("2024-01-15T10:30:00Z") },
    };
    const result = serializeFirestoreData(input);
    expect(result.name).toBe("Test");
    expect(result.createdAt).toBe("2024-01-15T10:30:00.000Z");
  });
});
