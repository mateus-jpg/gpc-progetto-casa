import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateUserForm } from "@/components/admin/CreateUserForm";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock server actions
vi.mock("@/actions/admin/users", () => ({
  createUser: vi.fn(() =>
    Promise.resolve({ success: true, uid: "new-user-uid" }),
  ),
  listAllStructures: vi.fn(() =>
    Promise.resolve({
      success: true,
      structures: [
        { id: "structure-1", name: "Structure One" },
        { id: "structure-2", name: "Structure Two" },
      ],
    }),
  ),
}));

import { toast } from "sonner";
import { createUser, listAllStructures } from "@/actions/admin/users";

describe("CreateUserForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all form fields", async () => {
    render(<CreateUserForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
  });

  it("should fetch and display structures", async () => {
    render(<CreateUserForm />);

    await waitFor(() => {
      expect(listAllStructures).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText("Structure One")).toBeInTheDocument();
      expect(screen.getByText("Structure Two")).toBeInTheDocument();
    });
  });

  it("should have required attribute on email field", async () => {
    render(<CreateUserForm />);

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toBeRequired();
  });

  it("should have required attribute on password field", async () => {
    render(<CreateUserForm />);

    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toBeRequired();
  });

  it("should show error for short password", async () => {
    const user = userEvent.setup();
    render(<CreateUserForm />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "12345");

    const submitButton = screen.getByRole("button", { name: /create user/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Password must be at least 6 characters",
      );
    });
  });

  it("should call createUser with form data", async () => {
    const user = userEvent.setup();
    render(<CreateUserForm />);

    await user.type(screen.getByLabelText(/email/i), "new@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.type(screen.getByLabelText(/display name/i), "New User");
    await user.type(screen.getByLabelText(/phone/i), "+1234567890");

    const submitButton = screen.getByRole("button", { name: /create user/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(createUser).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password123",
        displayName: "New User",
        phone: "+1234567890",
        role: "user",
        structureIds: [],
      });
    });
  });

  it("should redirect to users list on success", async () => {
    const user = userEvent.setup();
    render(<CreateUserForm />);

    await user.type(screen.getByLabelText(/email/i), "new@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");

    const submitButton = screen.getByRole("button", { name: /create user/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/admin/users");
    });
  });

  it("should show success toast on successful creation", async () => {
    const user = userEvent.setup();
    render(<CreateUserForm />);

    await user.type(screen.getByLabelText(/email/i), "new@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");

    const submitButton = screen.getByRole("button", { name: /create user/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("User created successfully");
    });
  });

  it("should show error toast on creation failure", async () => {
    vi.mocked(createUser).mockResolvedValueOnce({
      success: false,
      error: "Email already exists",
    });

    const user = userEvent.setup();
    render(<CreateUserForm />);

    await user.type(screen.getByLabelText(/email/i), "existing@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");

    const submitButton = screen.getByRole("button", { name: /create user/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Email already exists");
    });
  });

  it("should render cancel button", () => {
    render(<CreateUserForm />);

    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("should navigate back on cancel", async () => {
    const user = userEvent.setup();
    render(<CreateUserForm />);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockPush).toHaveBeenCalledWith("/admin/users");
  });

  it("should display form title", () => {
    render(<CreateUserForm />);

    expect(screen.getByText(/create new user/i)).toBeInTheDocument();
  });
});
