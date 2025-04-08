import React from "react";
import {
    render,
    screen,
    fireEvent,
    waitFor,
    act
} from "@testing-library/react";
import Auth from "./Auth";
import axios from "axios";
import { BrowserRouter } from "react-router-dom";

//––– MOCK AXIOS –––
jest.mock("axios");

//––– MOCK NAVIGATION –––
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
}));

//––– HELPER TO RENDER THE COMPONENT –––
const renderComponent = (setUser = jest.fn()) => {
    return render(
        <BrowserRouter>
            <Auth setUser={setUser} />
        </BrowserRouter>
    );
};

describe("Auth Component", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("renders login form by default", () => {
        renderComponent();
        expect(screen.getByRole("heading", { name: /Login/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    });

    it("switches to signup mode", () => {
        renderComponent();
        fireEvent.click(screen.getByText("Don&apos;t have an account? Sign up"));
        expect(screen.getByRole("heading", { name: /Sign Up/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Confirm Password")).toBeInTheDocument();
    });

    it("shows password mismatch error during signup", () => {
        renderComponent();
        fireEvent.click(screen.getByText("Don&apos;t have an account? Sign up"));
        fireEvent.change(screen.getByPlaceholderText("Password"), {
            target: { value: "Abc123" }
        });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), {
            target: { value: "Wrong123" }
        });
        expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });

    it("shows error if password doesn't meet complexity during signup", async () => {
        renderComponent();
        fireEvent.click(screen.getByText("Don&apos;t have an account? Sign up"));
        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "newuser" }
        });
        fireEvent.change(screen.getByPlaceholderText("Password"), {
            target: { value: "simple" }
        });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), {
            target: { value: "simple" }
        });
        fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));
        expect(
            await screen.findByText(
                "Password must contain at least one uppercase letter, one lowercase letter, and one number."
            )
        ).toBeInTheDocument();
    });

    it("successful signup shows confirmation modal", async () => {
        axios.post.mockResolvedValue({ data: "User registered successfully" });
        renderComponent();
        fireEvent.click(screen.getByText("Don&apos;t have an account? Sign up"));
        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "newuser" }
        });
        fireEvent.change(screen.getByPlaceholderText("Password"), {
            target: { value: "Abc123" }
        });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), {
            target: { value: "Abc123" }
        });
        fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

        // Wait for the confirmation modal to appear
        expect(await screen.findByText("Are you sure you want to register?")).toBeInTheDocument();
    });

    it("successful login navigates to dashboard and sets user", async () => {
        const setUser = jest.fn();
        axios.post.mockResolvedValue({ data: "Login successful" });
        renderComponent(setUser);

        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "testuser" }
        });
        fireEvent.change(screen.getByPlaceholderText("Password"), {
            target: { value: "Test123" }
        });
        fireEvent.click(screen.getByRole("button", { name: "Login" }));

        await waitFor(() => {
            expect(setUser).toHaveBeenCalledWith("testuser");
            expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
        });
    });

    it("shows error on failed login (wrong credentials)", async () => {
        axios.post.mockRejectedValue({
            response: { status: 401, data: "Invalid username or password" }
        });
        renderComponent();

        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "wronguser" }
        });
        fireEvent.change(screen.getByPlaceholderText("Password"), {
            target: { value: "Wrong123" }
        });
        fireEvent.click(screen.getByRole("button", { name: "Login" }));

        expect(await screen.findByText("Invalid username or password")).toBeInTheDocument();
    });

    it("shows lockout error on 423 response", async () => {
        axios.post.mockRejectedValue({ response: { status: 423 } });
        renderComponent();

        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "lockeduser" }
        });
        fireEvent.change(screen.getByPlaceholderText("Password"), {
            target: { value: "Locked123" }
        });
        fireEvent.click(screen.getByRole("button", { name: "Login" }));

        expect(
            await screen.findByText("Account temporarily locked. Please try again shortly.")
        ).toBeInTheDocument();
    });

    it("confirms final signup successfully", async () => {
        // ✅ 1. Mock the POST /auth/signup response
        axios.post.mockImplementation((url) => {
            if (url.includes("/auth/signup")) {
                return Promise.resolve({ data: "User registered successfully" });
            }
            return Promise.resolve({ data: "Login successful" });
        });

        renderComponent();

        // ✅ 2. Switch to signup mode and fill out form
        fireEvent.click(screen.getByText("Don&apos;t have an account? Sign up"));
        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "newuser" }
        });
        fireEvent.change(screen.getByPlaceholderText("Password"), {
            target: { value: "Abc123" }
        });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), {
            target: { value: "Abc123" }
        });

        // ✅ 3. Trigger signup
        fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

        // ✅ 4. Modal should appear now
        expect(await screen.findByText("Are you sure you want to register?")).toBeInTheDocument();

        // ✅ 5. Confirm final signup
        fireEvent.click(screen.getByRole("button", { name: "Yes, Create Account" }));

        // ✅ 6. Wait for final message
        await waitFor(() => {
            expect(screen.getByText("Signup successful! Please log in.")).toBeInTheDocument();
        });

        // ✅ 7. Wait for transition to login view
        await act(() => new Promise(resolve => setTimeout(resolve, 1500)));

        // ✅ 8. Check that login header is back
        expect(screen.getByRole("heading", { name: /login/i })).toBeInTheDocument();
    });


    test("cancels signup and deletes the account", async () => {
        // ✅ Mock signup and delete responses
        axios.post.mockResolvedValueOnce({ data: "User registered successfully" });
        axios.delete.mockResolvedValueOnce({ data: "Account deleted successfully" });

        renderComponent();

        // ✅ Switch to signup
        fireEvent.click(screen.getByText("Don&apos;t have an account? Sign up"));

        // ✅ Fill signup form
        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "newuser" },
        });
        fireEvent.change(screen.getByPlaceholderText("Password"), {
            target: { value: "Abc123" },
        });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), {
            target: { value: "Abc123" },
        });

        // ✅ Submit signup (triggers confirmation modal)
        fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

        // ✅ Wait for confirmation modal to appear
        expect(
            await screen.findByText("Are you sure you want to register?")
        ).toBeInTheDocument();

        // ✅ Click "No" to cancel signup and trigger account deletion
        fireEvent.click(screen.getByRole("button", { name: "No" }));

        // ✅ Wait for the cancellation success message
        await waitFor(() => {
            expect(
                screen.getByText("Account creation cancelled. Your account has been deleted.")
            ).toBeInTheDocument();
        });

        // ✅ Login header should be visible again
        expect(screen.getByRole("heading", { name: /login/i })).toBeInTheDocument();
    });
    test("shows error when account deletion fails during signup cancel", async () => {
        // Mock successful signup → triggers confirmation modal
        axios.post.mockResolvedValueOnce({ data: "User registered successfully" });

        // Mock DELETE failure
        axios.delete.mockRejectedValueOnce(new Error("Server error"));

        renderComponent();

        // Switch to signup mode
        fireEvent.click(screen.getByText("Don&apos;t have an account? Sign up"));

        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "newuser" },
        });
        fireEvent.change(screen.getByPlaceholderText("Password"), {
            target: { value: "Abc123" },
        });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), {
            target: { value: "Abc123" },
        });

        // Submit signup
        fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

        // Wait for confirmation modal
        expect(
            await screen.findByText("Are you sure you want to register?")
        ).toBeInTheDocument();

        // Click "No" to cancel account creation → triggers DELETE
        fireEvent.click(screen.getByRole("button", { name: "No" }));

        // Wait for error message from catch block
        await waitFor(() => {
            expect(
                screen.getByText("Failed to delete account. Please contact support.")
            ).toBeInTheDocument();
        });
    });
    test("shows cancel signup confirmation modal when user clicks 'Cancel and go back to login'", async () => {
        renderComponent();

        // Switch to signup mode
        fireEvent.click(screen.getByText("Don&apos;t have an account? Sign up"));

        // Click the cancel button
        fireEvent.click(screen.getByText("Cancel sign up and return to login"));

        // Expect confirmation modal to show up
        expect(
            await screen.findByText("Are you sure you want to cancel account creation?")
        ).toBeInTheDocument();
    });
    test("cancels signup and resets all fields", async () => {
        renderComponent();

        // Switch to signup mode
        fireEvent.click(screen.getByText("Don&apos;t have an account? Sign up"));

        // Fill out form
        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "testuser" },
        });
        fireEvent.change(screen.getByPlaceholderText("Password"), {
            target: { value: "Abc123" },
        });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), {
            target: { value: "Abc123" },
        });

        // Click the cancel button to open confirmation modal
        fireEvent.click(screen.getByText("Cancel sign up and return to login"));

        // Modal should appear
        expect(
            await screen.findByText("Are you sure you want to cancel account creation?")
        ).toBeInTheDocument();

        // Click "Yes" to confirm cancellation
        fireEvent.click(screen.getByRole("button", { name: "Yes, Cancel Signup" }));

        // After clicking "Yes", verify:
        // 1. Signup form is gone
        expect(screen.getByRole("heading", { name: /login/i })).toBeInTheDocument();

        // 2. Fields are cleared
        expect(screen.getByPlaceholderText("Username")).toHaveValue("");
        expect(screen.getByPlaceholderText("Password")).toHaveValue("");

        // 3. Confirm password field is not visible anymore
        expect(screen.queryByPlaceholderText("Confirm Password")).not.toBeInTheDocument();
    });
    test("clicking 'No' in cancel confirmation keeps user in signup mode", async () => {
        renderComponent();

        // Switch to signup
        fireEvent.click(screen.getByText("Don&apos;t have an account? Sign up"));

        // Click cancel to open confirmation modal
        fireEvent.click(screen.getByText("Cancel sign up and return to login"));

        // Confirm modal is visible
        expect(
            await screen.findByText("Are you sure you want to cancel account creation?")
        ).toBeInTheDocument();

        // Click "No" to close modal
        fireEvent.click(screen.getByRole("button", { name: "No" }));

        // Modal should be gone, and still in signup mode
        expect(
            screen.queryByText("Are you sure you want to cancel account creation?")
        ).not.toBeInTheDocument();

        expect(screen.getByRole("heading", { name: /sign up/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Confirm Password")).toBeInTheDocument();
    });
    test("shows password validation error during signup", async () => {
        renderComponent();

        fireEvent.click(screen.getByText("Don&apos;t have an account? Sign up"));

        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "testuser" }
        });
        fireEvent.change(screen.getByPlaceholderText("Password"), {
            target: { value: "abc" } // weak password
        });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), {
            target: { value: "abc" }
        });

        fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

        expect(
            screen.getByText(/Password must contain at least one uppercase/i)
        ).toBeInTheDocument();
    });

    test("shows error if username is already taken", async () => {
        axios.post.mockResolvedValueOnce({
            data: "Username already taken"
        });

        renderComponent();

        fireEvent.click(screen.getByText("Don&apos;t have an account? Sign up"));

        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "existingUser" }
        });
        fireEvent.change(screen.getByPlaceholderText("Password"), {
            target: { value: "Abc123" }
        });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), {
            target: { value: "Abc123" }
        });

        fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

        expect(await screen.findByText("Username already taken")).toBeInTheDocument();
    });
    test("shows login error on invalid credentials", async () => {
        axios.post.mockRejectedValueOnce({
            response: {
                status: 401,
                data: "Invalid username or password"
            }
        });

        renderComponent();

        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "wronguser" }
        });
        fireEvent.change(screen.getByPlaceholderText("Password"), {
            target: { value: "WrongPass1" }
        });

        fireEvent.click(screen.getByRole("button", { name: "Login" }));

        expect(
            await screen.findByText("Invalid username or password")
        ).toBeInTheDocument();
    });
    test("shows invalid login message for 401 response", async () => {
        axios.post.mockRejectedValueOnce({
            response: {
                status: 401,
                data: "Invalid username or password"
            }
        });

        renderComponent();

        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "invalidUser" }
        });
        fireEvent.change(screen.getByPlaceholderText("Password"), {
            target: { value: "WrongPass123" }
        });

        fireEvent.click(screen.getByRole("button", { name: "Login" }));

        expect(await screen.findByText("Invalid username or password")).toBeInTheDocument();
    });

    test("shows generic login error for unexpected failure", async () => {
        axios.post.mockRejectedValueOnce(new Error("Something went wrong"));

        renderComponent();

        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "user" }
        });
        fireEvent.change(screen.getByPlaceholderText("Password"), {
            target: { value: "Abc123" }
        });

        fireEvent.click(screen.getByRole("button", { name: "Login" }));

        expect(await screen.findByText("Login failed. Please try again.")).toBeInTheDocument();
    });

    test("shows fallback signup error when axios throws", async () => {
        axios.post.mockRejectedValueOnce(new Error("Network error"));

        renderComponent();

        fireEvent.click(screen.getByText("Don&apos;t have an account? Sign up"));

        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "erroruser" }
        });
        fireEvent.change(screen.getByPlaceholderText("Password"), {
            target: { value: "Abc123" }
        });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), {
            target: { value: "Abc123" }
        });

        fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

        expect(await screen.findByText("Username already taken or server error")).toBeInTheDocument();
    });
    test("shows server error if signup response is unexpected", async () => {
        axios.post.mockResolvedValueOnce({
            data: "Something unexpected" // doesn't match either condition
        });

        renderComponent();

        fireEvent.click(screen.getByText("Don&apos;t have an account? Sign up"));

        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "testuser" }
        });
        fireEvent.change(screen.getByPlaceholderText("Password"), {
            target: { value: "Abc123" }
        });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), {
            target: { value: "Abc123" }
        });

        fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

        expect(await screen.findByText("Server error, please try again.")).toBeInTheDocument();
    });
    test('shows error if login response is not "Login successful"', async () => {
        // mock axios to return something else
        axios.post.mockImplementationOnce(() =>
            Promise.resolve({ data: "Unexpected message" })
        );

        render(<Auth setUser={jest.fn()} />);

        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "wronguser" },
        });
        fireEvent.change(screen.getByPlaceholderText("Password"), {
            target: { value: "wrongpass" },
        });

        fireEvent.click(screen.getByRole("button", { name: /login/i }));

        await waitFor(() => {
            expect(screen.getByText("Login failed. Please try again.")).toBeInTheDocument();
        });
    });


});
