import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Firebase Admin before importing the module under test
vi.mock("@/lib/firebase/firebaseAdmin", () => {
  const mockUserRecord = {
    uid: "new-user-uid",
    email: "new@example.com",
    displayName: "New User",
  };

  const mockAuth = {
    createUser: vi.fn(() => Promise.resolve(mockUserRecord)),
    getUser: vi.fn(() =>
      Promise.resolve({
        uid: "test-user-uid",
        email: "test@example.com",
        displayName: "Test User",
        photoURL: null,
        disabled: false,
        metadata: {
          creationTime: "2024-01-01T00:00:00Z",
          lastSignInTime: "2024-01-15T00:00:00Z",
        },
      }),
    ),
    updateUser: vi.fn(() => Promise.resolve(mockUserRecord)),
    listUsers: vi.fn(() =>
      Promise.resolve({
        users: [
          {
            uid: "user-1",
            email: "user1@example.com",
            displayName: "User One",
            metadata: {
              creationTime: "2024-01-01T00:00:00Z",
              lastSignInTime: "2024-01-15T00:00:00Z",
            },
          },
        ],
        pageToken: undefined,
      }),
    ),
  };

  return {
    auth: mockAuth,
    db: {},
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
      role: "admin",
      structureIds: ["structure-1"],
    }),
  };

  const mockStructureDoc = {
    exists: true,
    data: () => ({
      name: "Test Structure",
      admins: ["admin-uid"],
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
      structures: () => ({
        doc: vi.fn(() => ({
          get: vi.fn(() => Promise.resolve(mockStructureDoc)),
        })),
        get: vi.fn(() =>
          Promise.resolve({
            docs: [
              {
                id: "structure-1",
                data: () => ({ name: "Structure One" }),
              },
            ],
          }),
        ),
      }),
      auditLogs: () => ({
        add: vi.fn(() => Promise.resolve({ id: "log-id" })),
      }),
    },
    getUserDocument: vi.fn(() =>
      Promise.resolve({
        exists: true,
        data: {
          uid: "test-user-uid",
          email: "test@example.com",
          role: "admin",
          structureIds: ["structure-1"],
        },
        collection: "operators",
      }),
    ),
    serializeFirestoreDoc: vi.fn((data) => data),
    arraysIntersect: vi.fn((a, b) => {
      const set = new Set(a || []);
      return (b || []).some((x) => set.has(x));
    }),
  };
});

// Mock server-auth
vi.mock("@/utils/server-auth", () => ({
  requireUser: vi.fn(() => Promise.resolve({ userUid: "test-user-uid" })),
  verifySuperAdmin: vi.fn(() => Promise.resolve(true)),
  verifyUserPermissions: vi.fn(() =>
    Promise.resolve({
      operatorData: { role: "admin" },
      userStructures: [],
      isSuperAdmin: true,
    }),
  ),
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

// Mock audit
vi.mock("@/utils/audit", () => ({
  logPermissionChange: vi.fn(() => Promise.resolve()),
  logAdminAction: vi.fn(() => Promise.resolve()),
}));

// Mock lib/utils
vi.mock("@/lib/utils", () => ({
  serializeFirestoreData: vi.fn((data) => data),
}));

// Import after mocks
import { listAllUsers } from "@/actions/admin/users";
import { auth } from "@/lib/firebase/firebaseAdmin";
import { requireUser, verifySuperAdmin } from "@/utils/server-auth";

describe("Admin User Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listAllUsers", () => {
    it("should list users when called by super admin", async () => {
      const result = await listAllUsers();

      expect(requireUser).toHaveBeenCalled();
      expect(verifySuperAdmin).toHaveBeenCalledWith({
        userUid: "test-user-uid",
      });
      expect(auth.listUsers).toHaveBeenCalledWith(100, undefined);
      expect(result.users).toHaveLength(1);
      expect(result.users[0].email).toBe("user1@example.com");
    });

    it("should respect maxResults parameter", async () => {
      await listAllUsers(50);

      expect(auth.listUsers).toHaveBeenCalledWith(50, undefined);
    });

    it("should pass pageToken for pagination", async () => {
      await listAllUsers(100, "next-page-token");

      expect(auth.listUsers).toHaveBeenCalledWith(100, "next-page-token");
    });

    it("should throw error when user is not authenticated", async () => {
      vi.mocked(requireUser).mockRejectedValueOnce(new Error("Unauthorized"));

      await expect(listAllUsers()).rejects.toThrow();
    });

    it("should throw error when user is not super admin", async () => {
      vi.mocked(verifySuperAdmin).mockRejectedValueOnce(new Error("Forbidden"));

      await expect(listAllUsers()).rejects.toThrow();
    });
  });
});
