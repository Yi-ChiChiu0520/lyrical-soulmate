import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import Auth from "./Auth";

jest.mock("axios", () => ({
    post: jest.fn((url) => {
        if (url.includes("signup")) {
            return Promise.resolve({ data: "User created successfully" });
        }
        if (url.includes("login")) {
            return Promise.resolve({ data: "Login successful" });
        }
        return Promise.reject(new Error("Error"));
    }),
}));

describe("Auth Component", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("renders login form by default", () => {
        render(<MemoryRouter><Auth /></MemoryRouter>);

        expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    });

    test("switches to sign up form when toggle button is clicked", async () => {
        render(<MemoryRouter><Auth /></MemoryRouter>);

        fireEvent.click(screen.getByRole("button", { name: "Don't have an account? Sign up" }));

        expect(await screen.findByRole("heading", { name: "Sign Up" })).toBeInTheDocument();
    });

    test("shows password mismatch error immediately", () => {
        render(<MemoryRouter><Auth /></MemoryRouter>);

        fireEvent.click(screen.getByRole("button", { name: "Don't have an account? Sign up" }));

        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Password1" } });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), { target: { value: "Password2" } });

        expect(screen.queryByText("Passwords do not match")).toBeInTheDocument();

        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), { target: { value: "Password1" } });

        expect(screen.queryByText("Passwords do not match")).not.toBeInTheDocument();
    });

    test("shows password requirements error after clicking Sign Up", async () => {
        render(<MemoryRouter><Auth /></MemoryRouter>);

        fireEvent.click(screen.getByRole("button", { name: "Don't have an account? Sign up" }));

        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "password" } });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), { target: { value: "password" } });

        fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

        expect(await screen.findByText("Password must contain at least one uppercase letter, one lowercase letter, and one number.")).toBeInTheDocument();
    });

    test("successfully signs up a new user and shows confirmation modal", async () => {
        axios.post.mockResolvedValueOnce({ data: "User registered successfully" });

        render(<MemoryRouter><Auth /></MemoryRouter>);

        fireEvent.click(screen.getByRole("button", { name: "Don't have an account? Sign up" }));

        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "testuser" } });
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Password1" } });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), { target: { value: "Password1" } });

        fireEvent.click(screen.getByRole("button", { name: "Sign Up" })); // Triggers agreement modal

        // Wait for agreement modal to appear
        expect(await screen.findByText("I would like to sign up. Do you agree?")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Yes, Create Account" })); // Confirms signup

        // Now check for confirmation modal
        expect(await screen.findByText("Account Created!")).toBeInTheDocument();
    });


    test("displays error when login fails", async () => {
        axios.post.mockRejectedValueOnce(new Error("Invalid username or password"));

        render(<MemoryRouter><Auth /></MemoryRouter>);

        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "testuser" } });
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "wrongpassword" } });

        fireEvent.click(screen.getByRole("button", { name: "Login" }));

        expect(await screen.findByText("Invalid username or password")).toBeInTheDocument();
    });

    test("successfully logs in a user and navigates to dashboard", async () => {
        axios.post.mockResolvedValueOnce({ data: "Login successful" });

        render(<MemoryRouter><Auth /></MemoryRouter>);

        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "testuser" } });
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Password1" } });

        fireEvent.click(screen.getByRole("button", { name: "Login" }));

        expect(await screen.findByText("Login successful")).toBeInTheDocument();
    });

    test("displays error when username is already taken during signup", async () => {
        axios.post.mockRejectedValueOnce(new Error("Username already taken"));

        render(<MemoryRouter><Auth /></MemoryRouter>);

        fireEvent.click(screen.getByText("Don't have an account? Sign up"));
        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "testuser" } });
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Password1" } });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), { target: { value: "Password1" } });

        fireEvent.click(screen.getByRole("button", { name: "Sign Up" })); // Triggers agreement modal
        fireEvent.click(screen.getByRole("button", { name: "Yes, Create Account" })); // Tries to create account

        expect(await screen.findByText("Username already taken or server error")).toBeInTheDocument();
    });

    test("closes agreement modal when clicking 'No, Cancel'", async () => {
        render(<MemoryRouter><Auth /></MemoryRouter>);

        fireEvent.click(screen.getByText("Don't have an account? Sign up"));
        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "testuser" } });
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Password1" } });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), { target: { value: "Password1" } });

        fireEvent.click(screen.getByRole("button", { name: "Sign Up" })); // Triggers agreement modal
        expect(await screen.findByText("I would like to sign up. Do you agree?")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "No, Cancel" })); // Cancels signup

        await waitFor(() => {
            expect(screen.queryByText("I would like to sign up. Do you agree?")).not.toBeInTheDocument();
        });
    });
    test("shows error message for server error during signup", async () => {
        // Step 1: Render the component
        render(
            <MemoryRouter>
                <Auth />
            </MemoryRouter>
        );

        // Step 2: Currently on login, click "Don't have an account? Sign up" to switch to signup mode
        fireEvent.click(screen.getByText("Don't have an account? Sign up"));
        // Step 3: Fill in the signup form
        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "testuser" } });
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "TestPass123" } });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), { target: { value: "TestPass123" } });
        // Step 4: Click "Sign Up"
        fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

        // Step 5: await for agreement modal to show up
        await waitFor(() => {
            expect(screen.getByText("I would like to sign up. Do you agree?")).toBeInTheDocument();
        });

        // Step 6: Mock the API response to simulate a server error (unexpected message)
        axios.post.mockResolvedValueOnce({ data: "Unexpected server error occurred" });

        // Step 7: Click "Yes, Create Account" to confirm signup
        fireEvent.click(screen.getByRole("button", { name: "Yes, Create Account" }));

        // Step 8: Expect the "Server error, please try again." message to appear
        await waitFor(() => {
            expect(screen.getByText("Server error, please try again.")).toBeInTheDocument();
        });
    });
    test("shows error message when username is already taken", async () => {
        // Step 1: Render the component
        render(
            <MemoryRouter>
                <Auth />
            </MemoryRouter>
        );

        // Step 2: Click "Don't have an account? Sign up" to switch to signup mode
        fireEvent.click(screen.getByText("Don't have an account? Sign up"));

        // Step 3: Fill in the signup form
        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "testuser" } });
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "TestPass123" } });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), { target: { value: "TestPass123" } });

        // Step 4: Click "Sign Up"
        fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

        // Step 5: Expect agreement modal to show up
        await waitFor(() => {
            expect(screen.getByText("I would like to sign up. Do you agree?")).toBeInTheDocument();
        });

        // Step 6: Mock the API response to simulate "Username already taken"
        axios.post.mockResolvedValueOnce({ data: "Username already taken" });

        // Step 7: Click "Yes, Create Account" to confirm signup
        fireEvent.click(screen.getByRole("button", { name: "Yes, Create Account" }));

        // Step 8: Expect the error message to appear
        await waitFor(() => {
            expect(screen.getByText("Username already taken")).toBeInTheDocument();
        });
    });
    test("displays error message when login fails", async () => {
        axios.post.mockResolvedValueOnce({ data: "Invalid username or password" }); // Mock failure

        render(
            <MemoryRouter>
                <Auth />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "wronguser" } });
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "wrongpass" } });
        fireEvent.click(screen.getByRole("button", { name: "Login" }));

        await waitFor(() => {
            expect(screen.getByText("Invalid username or password")).toBeInTheDocument();
        });
    });


    test("switches back to login form after signup confirmation", async () => {
        axios.post.mockResolvedValueOnce({ data: "User registered successfully" });

        render(<MemoryRouter><Auth /></MemoryRouter>);

        fireEvent.click(screen.getByText("Don't have an account? Sign up"));
        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "testuser" } });
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Password1" } });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), { target: { value: "Password1" } });

        fireEvent.click(screen.getByRole("button", { name: "Sign Up" })); // Triggers agreement modal
        fireEvent.click(screen.getByRole("button", { name: "Yes, Create Account" })); // Confirms signup

        expect(await screen.findByText("Account Created!")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Yes, Log in" })); // Confirms final step

        await waitFor(() => {
            expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
        });
    });


});
