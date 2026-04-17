import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileForm } from "@/components/profile/ProfileForm";

// Mock the updateProfile action
vi.mock("@/actions/profile", () => ({
  updateProfile: vi.fn(() => Promise.resolve({ success: true })),
}));

import { updateProfile } from "@/actions/profile";

describe("ProfileForm", () => {
  const mockProfile = {
    displayName: "Test User",
    email: "test@example.com",
    phone: "+1234567890",
  };

  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with profile data", () => {
    render(<ProfileForm profile={mockProfile} onUpdate={mockOnUpdate} />);

    expect(screen.getByLabelText(/email/i)).toHaveValue("test@example.com");
    expect(screen.getByLabelText(/display name/i)).toHaveValue("Test User");
    expect(screen.getByLabelText(/phone/i)).toHaveValue("+1234567890");
  });

  it("should render with empty profile", () => {
    render(<ProfileForm profile={{}} onUpdate={mockOnUpdate} />);

    expect(screen.getByLabelText(/email/i)).toHaveValue("");
    expect(screen.getByLabelText(/display name/i)).toHaveValue("");
    expect(screen.getByLabelText(/phone/i)).toHaveValue("");
  });

  it("should update input values on change", async () => {
    const user = userEvent.setup();
    render(<ProfileForm profile={mockProfile} onUpdate={mockOnUpdate} />);

    const displayNameInput = screen.getByLabelText(/display name/i);
    await user.clear(displayNameInput);
    await user.type(displayNameInput, "New Name");

    expect(displayNameInput).toHaveValue("New Name");
  });

  it("should call updateProfile on form submit", async () => {
    const user = userEvent.setup();
    render(<ProfileForm profile={mockProfile} onUpdate={mockOnUpdate} />);

    const submitButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        displayName: "Test User",
        email: "test@example.com",
        phone: "+1234567890",
      });
    });
  });

  it("should call onUpdate callback on successful save", async () => {
    const user = userEvent.setup();
    render(<ProfileForm profile={mockProfile} onUpdate={mockOnUpdate} />);

    const submitButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it("should show loading state while saving", async () => {
    // Make updateProfile slow
    vi.mocked(updateProfile).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ success: true }), 100),
        ),
    );

    const user = userEvent.setup();
    render(<ProfileForm profile={mockProfile} onUpdate={mockOnUpdate} />);

    const submitButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(submitButton);

    // Button should be disabled during save
    expect(submitButton).toBeDisabled();
  });

  it("should display Personal Information heading", () => {
    render(<ProfileForm profile={mockProfile} onUpdate={mockOnUpdate} />);

    expect(screen.getByText(/personal information/i)).toBeInTheDocument();
  });

  it("should display email warning message", () => {
    render(<ProfileForm profile={mockProfile} onUpdate={mockOnUpdate} />);

    expect(
      screen.getByText(
        /changing your email will update your login credentials/i,
      ),
    ).toBeInTheDocument();
  });
});
