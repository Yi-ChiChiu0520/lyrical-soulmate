import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Navbar from "./Navbar";
import { BrowserRouter } from "react-router-dom";

// Mock navigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => {
    const actual = jest.requireActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        Link: ({ to, children, ...rest }) => <a href={to} {...rest}>{children}</a>,
    };
});

// Mock lucide icons
jest.mock("lucide-react", () => ({
    Menu: () => <button data-testid="menu-icon">MenuIcon</button>,
    X: () => <div data-testid="x-icon">XIcon</div>,
}));

describe("Navbar", () => {
    let mockSetUser;

    beforeEach(() => {
        mockSetUser = jest.fn();
        localStorage.clear();
    });

    const renderNavbar = () => render(
        <BrowserRouter>
            <Navbar setUser={mockSetUser} />
        </BrowserRouter>
    );

    it("renders the logo, title, and Team 28 badge", () => {
        renderNavbar();
        expect(screen.getByAltText("Logo")).toBeInTheDocument();
        expect(screen.getByText("Let's Get Lyrical")).toBeInTheDocument();
        expect(screen.getByText("Team 28")).toBeInTheDocument();
    });

    it("shows desktop nav links on medium+ screens", () => {
        renderNavbar();
        expect(screen.getByText("Dashboard")).toBeInTheDocument();
        expect(screen.getByText("Favorites")).toBeInTheDocument();
        expect(screen.getByText("Compare")).toBeInTheDocument();
        expect(screen.getByText("Lyrical Match")).toBeInTheDocument();
    });

    it("logs out from mobile menu", () => {
        renderNavbar();
        fireEvent.click(screen.getByTestId("menu-icon"));
        fireEvent.click(screen.getByTestId("mobile-logout"));

        expect(localStorage.getItem("user")).toBeNull();
        expect(mockSetUser).toHaveBeenCalledWith(null);
        expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("displays mobile menu links correctly", () => {
        renderNavbar();
        fireEvent.click(screen.getByTestId("menu-icon"));

        expect(screen.getByTestId("mobile-link-dashboard")).toBeInTheDocument();
        expect(screen.getByTestId("mobile-link-favorites")).toBeInTheDocument();
        expect(screen.getByTestId("mobile-link-compare")).toBeInTheDocument();
        expect(screen.getByTestId("mobile-link-match")).toBeInTheDocument();
    });

    it("closes the menu when a mobile link is clicked", () => {
        renderNavbar();
        fireEvent.click(screen.getByTestId("menu-icon")); // open menu

        const dashboardLink = screen.getByTestId("mobile-link-dashboard");
        fireEvent.click(dashboardLink); // simulate click

        // You can add a rerender or waitFor assertion here if state update is async
        expect(screen.queryByTestId("mobile-menu")).not.toBeInTheDocument();
    });
    it("closes the menu when each mobile link is clicked", () => {
        renderNavbar();

        // Define mobile link test IDs
        const mobileLinkTestIds = [
            "mobile-link-dashboard",
            "mobile-link-favorites",
            "mobile-link-compare",
            "mobile-link-match"
        ];

        // For each link, open the menu -> click -> check menu closes
        mobileLinkTestIds.forEach((testId) => {
            fireEvent.click(screen.getByTestId("menu-icon")); // open menu
            const link = screen.getByTestId(testId);
            fireEvent.click(link); // simulate click
            expect(screen.queryByTestId("mobile-menu")).not.toBeInTheDocument(); // menu should close
        });
    });

});
