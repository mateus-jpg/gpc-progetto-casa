import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Firebase Admin
vi.mock("@/lib/firebase/firebaseAdmin", () => {
  const mockAuth = {
    getUser: vi.fn(() =>
      Promise.resolve({
        uid: "test-user-uid",
        email: "test@example.com",
        displayName: "Test User",
        photoURL: "https://example.com/photo.jpg",
        metadata: {
          creationTime: "2024-01-01T00:00:00Z",
          lastSignInTime: "2024-01-15T00:00:00Z",
        },
      }),
    ),
    updateUser: vi.fn(() => Promise.resolve()),
  };

  return {
    auth: mockAuth,
    default: {
      firestore: vi.fn(),
    },
  };
});

// Mock database utilities
vi.mock("@/utils/database", () => {
  const mockOperatorDoc = {
    exists: true,
    data: () => ({
      email: "test@example.com",
      displayName: "Test User",
      phone: "+1234567890",
      role: "user",
      structureIds: ["structure-1", "structure-2"],
    }),
  };

  return {
    collections: {
      operators: () => ({
        doc: vi.fn(() => ({
          get: vi.fn(() => Promise.resolve(mockOperatorDoc)),
          set: vi.fn(() => Promise.resolve()),
          update: vi.fn(() => Promise.resolve()),
        })),
      }),
    },
  };
});

// Mock server-auth
vi.mock("@/utils/server-auth", () => ({
  requireUser: vi.fn(() => Promise.resolve({ userUid: "test-user-uid" })),
}));

// Mock logger
vi.mock("@/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock lib/utils
vi.mock("@/lib/utils", () => ({
  serializeFirestoreData: vi.fn((data) => data),
}));

import { getProfile, updateProfile } from "@/actions/profile";
import { auth } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/utils/database";
import { requireUser } from "@/utils/server-auth";

describe("Profile Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProfile", () => {
    it("should return user profile data", async () => {
      const result = await getProfile();

      expect(result.success).toBe(true);
      expect(result.profile).toBeDefined();
      expect(result.profile.uid).toBe("test-user-uid");
      expect(result.profile.email).toBe("test@example.com");
    });

    it("should require authentication", async () => {
      await getProfile();

      expect(requireUser).toHaveBeenCalled();
    });

    it("should fetch from Firebase Auth", async () => {
      await getProfile();

      expect(auth.getUser).toHaveBeenCalledWith("test-user-uid");
    });

    it("should combine Auth and Firestore data", async () => {
      const result = await getProfile();

      // From Auth
      expect(result.profile.email).toBe("test@example.com");
      expect(result.profile.photoURL).toBe("https://example.com/photo.jpg");
      // From Firestore
      expect(result.profile.phone).toBe("+1234567890");
      expect(result.profile.structureIds).toEqual([
        "structure-1",
        "structure-2",
      ]);
    });

    it("should return error when not authenticated", async () => {
      vi.mocked(requireUser).mockRejectedValueOnce(new Error("Unauthorized"));

      const result = await getProfile();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });
  });

  describe("updateProfile", () => {
    it("should update profile with new display name", async () => {
      const result = await updateProfile({ displayName: "New Name" });

      expect(result.success).toBe(true);
      expect(auth.updateUser).toHaveBeenCalledWith("test-user-uid", {
        displayName: "New Name",
      });
    });

    it("should update profile with new email", async () => {
      const result = await updateProfile({ email: "new@example.com" });

      expect(result.success).toBe(true);
      expect(auth.updateUser).toHaveBeenCalledWith("test-user-uid", {
        email: "new@example.com",
      });
    });

    it("should require authentication", async () => {
      await updateProfile({ displayName: "Test" });

      expect(requireUser).toHaveBeenCalled();
    });

    it("should return error on failure", async () => {
      vi.mocked(auth.updateUser).mockRejectedValueOnce(
        new Error("Update failed"),
      );

      const result = await updateProfile({ email: "invalid" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Update failed");
    });
  });
});
