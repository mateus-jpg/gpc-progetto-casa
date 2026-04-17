import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock ResizeObserver (required by Radix UI components)
class ResizeObserverMock {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock;

// Mock IntersectionObserver
class IntersectionObserverMock {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.IntersectionObserver = IntersectionObserverMock;

// Mock pointer capture (used by Radix components)
Element.prototype.hasPointerCapture = vi.fn();
Element.prototype.setPointerCapture = vi.fn();
Element.prototype.releasePointerCapture = vi.fn();

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  useParams: () => ({}),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: () => ({
    get: vi.fn((key) => {
      if (key === "x-user-uid") return "test-user-uid";
      return null;
    }),
  }),
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// Mock Firebase client
vi.mock("@/lib/firebase/firebaseClient", () => ({
  clientAuth: {
    currentUser: null,
  },
  db: {},
}));

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
