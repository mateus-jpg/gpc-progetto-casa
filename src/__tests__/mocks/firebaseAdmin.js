import { vi } from "vitest";

// Mock Firestore document
export const mockDoc = {
  exists: true,
  id: "test-doc-id",
  data: vi.fn(() => ({
    email: "test@example.com",
    displayName: "Test User",
    role: "user",
    structureIds: ["structure-1"],
  })),
};

// Mock Firestore collection
export const mockCollection = {
  doc: vi.fn(() => ({
    get: vi.fn(() => Promise.resolve(mockDoc)),
    set: vi.fn(() => Promise.resolve()),
    update: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve()),
  })),
  where: vi.fn(() => ({
    get: vi.fn(() => Promise.resolve({ docs: [mockDoc] })),
  })),
  get: vi.fn(() => Promise.resolve({ docs: [mockDoc] })),
  add: vi.fn(() => Promise.resolve({ id: "new-doc-id" })),
};

// Mock Firestore
export const mockFirestore = {
  collection: vi.fn(() => mockCollection),
};

// Mock Auth user record
export const mockUserRecord = {
  uid: "test-user-uid",
  email: "test@example.com",
  displayName: "Test User",
  photoURL: null,
  disabled: false,
  metadata: {
    creationTime: "2024-01-01T00:00:00Z",
    lastSignInTime: "2024-01-15T00:00:00Z",
  },
};

// Mock Auth
export const mockAuth = {
  createUser: vi.fn(() => Promise.resolve(mockUserRecord)),
  getUser: vi.fn(() => Promise.resolve(mockUserRecord)),
  updateUser: vi.fn(() => Promise.resolve(mockUserRecord)),
  deleteUser: vi.fn(() => Promise.resolve()),
  listUsers: vi.fn(() =>
    Promise.resolve({
      users: [mockUserRecord],
      pageToken: undefined,
    }),
  ),
};

// Mock Firebase Admin default export
const mockAdmin = {
  apps: [],
  initializeApp: vi.fn(),
  credential: {
    applicationDefault: vi.fn(),
  },
  firestore: vi.fn(() => mockFirestore),
  auth: vi.fn(() => mockAuth),
};

// Named exports
export const auth = mockAuth;
export const db = mockFirestore;

export default mockAdmin;
