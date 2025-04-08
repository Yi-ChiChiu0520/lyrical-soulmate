import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Navbar from "./Navbar";

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
}));

describe("Navbar", () => {
    beforeEach(() => {
        localStorage.setItem("user", JSON.stringify({ username: "testuser" }));
        mockNavigate.mockClear();
    });

    it("renders Dashboard and Favorites links", () => {
        render(<Navbar setUser={jest.fn()} />, { wrapper: MemoryRouter });

        expect(screen.getByText("Dashboard")).toBeInTheDocument();
        expect(screen.getByText("Favorites")).toBeInTheDocument();
    });

    it("handles logout correctly", () => {
        const mockSetUser = jest.fn();

        render(<Navbar setUser={mockSetUser} />, { wrapper: MemoryRouter });

        const logoutButton = screen.getByText("Logout");
        fireEvent.click(logoutButton);

        expect(localStorage.getItem("user")).toBeNull();
        expect(mockSetUser).toHaveBeenCalledWith(null);
        expect(mockNavigate).toHaveBeenCalledWith("/");
    });
});
