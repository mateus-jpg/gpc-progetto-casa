import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PasswordChangeForm } from "@/components/profile/PasswordChangeForm";

// Mock Firebase Auth
const mockReauthenticateWithCredential = vi.fn();
const mockUpdatePassword = vi.fn();
const _mockCredential = vi.fn();

vi.mock("firebase/auth", () => ({
  EmailAuthProvider: {
    credential: vi.fn(() => "mock-credential"),
  },
  reauthenticateWithCredential: (...args) =>
    mockReauthenticateWithCredential(...args),
  updatePassword: (...args) => mockUpdatePassword(...args),
}));

vi.mock("@/lib/firebase/firebaseClient", () => ({
  clientAuth: {
    currentUser: {
      uid: "test-user-uid",
      email: "test@example.com",
    },
  },
}));

import { toast } from "sonner";

describe("PasswordChangeForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReauthenticateWithCredential.mockResolvedValue(undefined);
    mockUpdatePassword.mockResolvedValue(undefined);
  });

  it("should render all password fields", () => {
    render(<PasswordChangeForm />);

    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
  });

  it("should render submit button", () => {
    render(<PasswordChangeForm />);

    expect(
      screen.getByRole("button", { name: /change password/i }),
    ).toBeInTheDocument();
  });

  it("should update input values on change", async () => {
    const user = userEvent.setup();
    render(<PasswordChangeForm />);

    const currentPasswordInput = screen.getByLabelText(/current password/i);
    await user.type(currentPasswordInput, "oldpassword");

    expect(currentPasswordInput).toHaveValue("oldpassword");
  });

  it("should show error when passwords do not match", async () => {
    const user = userEvent.setup();
    render(<PasswordChangeForm />);

    await user.type(screen.getByLabelText(/current password/i), "currentpass");
    await user.type(screen.getByLabelText(/^new password$/i), "newpassword1");
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "newpassword2",
    );

    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("New passwords do not match");
    });
  });

  it("should show error when new password is too short", async () => {
    const user = userEvent.setup();
    render(<PasswordChangeForm />);

    await user.type(screen.getByLabelText(/current password/i), "currentpass");
    await user.type(screen.getByLabelText(/^new password$/i), "12345");
    await user.type(screen.getByLabelText(/confirm new password/i), "12345");

    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "New password must be at least 6 characters",
      );
    });
  });

  it("should show error when fields are empty", async () => {
    const user = userEvent.setup();
    render(<PasswordChangeForm />);

    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("All fields are required");
    });
  });

  it("should call Firebase auth methods on valid submission", async () => {
    const user = userEvent.setup();
    render(<PasswordChangeForm />);

    await user.type(screen.getByLabelText(/current password/i), "currentpass");
    await user.type(screen.getByLabelText(/^new password$/i), "newpassword123");
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "newpassword123",
    );

    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(mockReauthenticateWithCredential).toHaveBeenCalled();
      expect(mockUpdatePassword).toHaveBeenCalled();
    });
  });

  it("should show success message on successful password change", async () => {
    const user = userEvent.setup();
    render(<PasswordChangeForm />);

    await user.type(screen.getByLabelText(/current password/i), "currentpass");
    await user.type(screen.getByLabelText(/^new password$/i), "newpassword123");
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "newpassword123",
    );

    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Password changed successfully",
      );
    });
  });

  it("should clear form after successful password change", async () => {
    const user = userEvent.setup();
    render(<PasswordChangeForm />);

    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/^new password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

    await user.type(currentPasswordInput, "currentpass");
    await user.type(newPasswordInput, "newpassword123");
    await user.type(confirmPasswordInput, "newpassword123");

    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(currentPasswordInput).toHaveValue("");
      expect(newPasswordInput).toHaveValue("");
      expect(confirmPasswordInput).toHaveValue("");
    });
  });

  it("should show error when current password is incorrect", async () => {
    mockReauthenticateWithCredential.mockRejectedValue({
      code: "auth/wrong-password",
    });

    const user = userEvent.setup();
    render(<PasswordChangeForm />);

    await user.type(
      screen.getByLabelText(/current password/i),
      "wrongpassword",
    );
    await user.type(screen.getByLabelText(/^new password$/i), "newpassword123");
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "newpassword123",
    );

    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Current password is incorrect");
    });
  });

  it("should display Change Password heading", () => {
    render(<PasswordChangeForm />);

    expect(
      screen.getByText(/change password/i, {
        selector: 'h3, [class*="title"], div',
      }),
    ).toBeInTheDocument();
  });
});
