// Mock axios
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

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter as Router } from "react-router-dom";
import Auth from "./Auth";
import axios from "axios";

describe("Auth Component", () => {
    beforeEach(() => {
        jest.clearAllMocks(); // Clear all mocks before each test
    });

    test("displays error when username is already taken during sign up", async () => {
        axios.post.mockRejectedValueOnce(new Error("Username already taken"));

        render(
            <Router>
                <Auth />
            </Router>
        );

        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "testuser" } });
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Password1" } });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), { target: { value: "Password1" } });

        fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

        expect(await screen.findByText("Username already taken or server error")).toBeInTheDocument();
    });

    test("renders sign up form by default", () => {
        render(
            <Router>
                <Auth />
            </Router>
        );
        expect(screen.getByRole("heading", { name: "Sign Up" })).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Confirm Password")).toBeInTheDocument();
    });

    test("switches to login form when toggle button is clicked", () => {
        render(
            <Router>
                <Auth />
            </Router>
        );
        fireEvent.click(screen.getByRole("button", { name: "Already have an account? Login" }));
        expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
        expect(screen.queryByPlaceholderText("Confirm Password")).not.toBeInTheDocument();
    });

    test("displays error when passwords do not match during sign up", async () => {
        render(
            <Router>
                <Auth />
            </Router>
        );
        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "testuser" } });
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Password1" } });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), { target: { value: "Password2" } });

        fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

        expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
    });

    test("displays error when password does not meet requirements during sign up", async () => {
        render(
            <Router>
                <Auth />
            </Router>
        );
        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "testuser" } });
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "password" } });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), { target: { value: "password" } });

        fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

        expect(await screen.findByText("Password must contain at least one uppercase letter, one lowercase letter, and one number.")).toBeInTheDocument();
    });

    test("successfully signs up a new user and shows confirmation modal", async () => {
        axios.post.mockResolvedValueOnce({ data: "User created successfully" });

        render(
            <Router>
                <Auth />
            </Router>
        );

        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "testuser" } });
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Password1" } });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), { target: { value: "Password1" } });

        fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

        // Wait for confirmation modal to appear
        expect(await screen.findByText("Account Created!")).toBeInTheDocument();
        expect(screen.getByText("Would you like to proceed to login?")).toBeInTheDocument();

        // Confirm signup
        fireEvent.click(screen.getByRole("button", { name: "Yes, Log in" }));

        // Ensure the form switches to login
        expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    });
    test("displays confirmation modal after successful signup", async () => {
        axios.post.mockResolvedValueOnce({ data: "User created successfully" });

        render(
            <Router>
                <Auth />
            </Router>
        );

        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "testuser" } });
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Password1" } });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), { target: { value: "Password1" } });

        fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

        // Wait for confirmation modal
        expect(await screen.findByText("Account Created!")).toBeInTheDocument();
        expect(screen.getByText("Would you like to proceed to login?")).toBeInTheDocument();
    });

    test("clicking 'Yes, Log in' switches to login form", async () => {
        axios.post.mockResolvedValueOnce({ data: "User created successfully" });

        render(
            <Router>
                <Auth />
            </Router>
        );

        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "testuser" } });
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Password1" } });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), { target: { value: "Password1" } });

        fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

        // Wait for confirmation modal
        expect(await screen.findByText("Account Created!")).toBeInTheDocument();

        // Click "Yes, Log in" button
        fireEvent.click(screen.getByRole("button", { name: "Yes, Log in" }));

        // Ensure the form switches to login
        expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    });

    test("clicking 'No, Cancel' closes the modal and keeps signup form", async () => {
        axios.post.mockResolvedValueOnce({ data: "User created successfully" });

        render(
            <Router>
                <Auth />
            </Router>
        );

        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "testuser" } });
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Password1" } });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), { target: { value: "Password1" } });

        fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

        // Wait for confirmation modal
        expect(await screen.findByText("Account Created!")).toBeInTheDocument();

        // Click "No, Cancel" button
        fireEvent.click(screen.getByRole("button", { name: "No, Cancel" }));

        // Ensure the modal is removed
        expect(screen.queryByText("Account Created!")).not.toBeInTheDocument();

        // Ensure the user is still on the signup form
        expect(screen.getByRole("heading", { name: "Sign Up" })).toBeInTheDocument();
    });
    test("displays error when login fails", async () => {
        axios.post.mockRejectedValueOnce(new Error("Invalid username or password"));

        render(
            <Router>
                <Auth />
            </Router>
        );
        fireEvent.click(screen.getByRole("button", { name: "Already have an account? Login" }));
        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "testuser" } });
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "wrongpassword" } });

        fireEvent.click(screen.getByRole("button", { name: "Login" }));

        expect(await screen.findByText("Invalid username or password")).toBeInTheDocument();
    });

    test("successfully logs in a user and navigates to dashboard", async () => {
        axios.post.mockResolvedValueOnce({ data: "Login successful" });

        render(
            <Router>
                <Auth />
            </Router>
        );
        fireEvent.click(screen.getByRole("button", { name: "Already have an account? Login" }));
        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "testuser" } });
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Password1" } });

        fireEvent.click(screen.getByRole("button", { name: "Login" }));

        expect(await screen.findByText("Login successful")).toBeInTheDocument();
        expect(window.location.pathname).toBe("/dashboard");
    });

    test("handles incorrect login credentials", async () => {
        axios.post.mockResolvedValueOnce({ data: "Invalid credentials" });

        render(
            <Router>
                <Auth />
            </Router>
        );

        fireEvent.click(screen.getByRole("button", { name: "Already have an account? Login" }));
        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "wronguser" } });
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "WrongPassword1" } });


        fireEvent.click(screen.getByRole("button", { name: "Login" }));

        expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
    });
});
