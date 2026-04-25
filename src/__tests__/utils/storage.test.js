import { describe, expect, it } from "vitest";
import {
  buildStorageBucketCandidates,
  normalizeBucketName,
  normalizeStorageObjectPath,
} from "@/utils/storage";

describe("normalizeBucketName", () => {
  it("removes gs:// prefixes and trailing slashes", () => {
    expect(normalizeBucketName("gs://gpc-obt/")).toBe("gpc-obt");
  });

  it("returns null for empty values", () => {
    expect(normalizeBucketName("")).toBeNull();
    expect(normalizeBucketName(null)).toBeNull();
  });
});

describe("normalizeStorageObjectPath", () => {
  it("keeps plain storage object paths", () => {
    expect(normalizeStorageObjectPath("files/abc123/test.pdf")).toBe(
      "files/abc123/test.pdf",
    );
  });

  it("strips leading slashes from object paths", () => {
    expect(normalizeStorageObjectPath("/files/abc123/test.pdf")).toBe(
      "files/abc123/test.pdf",
    );
  });

  it("extracts object paths from gs:// urls", () => {
    expect(
      normalizeStorageObjectPath("gs://gpc-obt/files/abc123/test.pdf"),
    ).toBe("files/abc123/test.pdf");
  });

  it("extracts object paths from firebase download urls", () => {
    expect(
      normalizeStorageObjectPath(
        "https://firebasestorage.googleapis.com/v0/b/gpc-obt/o/files%2Fabc123%2Ftest.pdf?alt=media",
      ),
    ).toBe("files/abc123/test.pdf");
  });

  it("rejects traversal attempts", () => {
    expect(
      normalizeStorageObjectPath("files/abc123/../../secret.pdf"),
    ).toBeNull();
  });
});

describe("buildStorageBucketCandidates", () => {
  it("keeps a stable, deduplicated candidate order", () => {
    expect(
      buildStorageBucketCandidates({
        defaultBucketName: "gpc-obt.firebasestorage.app",
        envBucketName: "gs://gpc-obt.firebasestorage.app",
        publicBucketName: "gpc-obt.firebasestorage.app",
        projectId: "gpc-obt",
      }),
    ).toEqual([
      "gpc-obt.firebasestorage.app",
      "gpc-obt",
      "gpc-obt.appspot.com",
    ]);
  });
});
