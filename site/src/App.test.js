import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { MemoryRouter } from "react-router-dom";

// Mock components to simplify route testing
jest.mock("./pages/Dashboard", () => () => <div>Mock Dashboard</div>);
jest.mock("./pages/Favorites", () => () => <div>Mock Favorites</div>);
jest.mock("./pages/Auth", () => () => <div>Let&apos;s Get Lyrical</div>);
jest.mock("./pages/Navbar", () => () => <div>Navbar</div>);

describe("App routing", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test("renders Dashboard when user is in localStorage", async () => {
        localStorage.setItem("user", "testUser");

        render(
            <MemoryRouter initialEntries={["/dashboard"]}>
                <App />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText("Mock Dashboard")).toBeInTheDocument();
        });
    });

    test("renders Favorites when user is in localStorage", async () => {
        localStorage.setItem("user", "testUser");

        render(
            <MemoryRouter initialEntries={["/favorites"]}>
                <App />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText("Mock Favorites")).toBeInTheDocument();
        });
    });

    test("redirects to Auth when visiting /dashboard with no user", async () => {
        render(
            <MemoryRouter initialEntries={["/dashboard"]}>
                <App />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Let's Get Lyrical/i)).toBeInTheDocument();
        });
    });

    test("redirects to Auth when visiting /favorites with no user", async () => {
        render(
            <MemoryRouter initialEntries={["/favorites"]}>
                <App />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Let's Get Lyrical/i)).toBeInTheDocument();
        });
    });
    test("renders Navbar when user is in localStorage and path is not '/'", async () => {
        localStorage.setItem("user", "testUser");

        render(
            <MemoryRouter initialEntries={["/dashboard"]}>
                <App />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText("Navbar")).toBeInTheDocument();
        });
    });

});
