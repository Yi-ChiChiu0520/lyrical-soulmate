import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "./Footer";

const mockNavigate = jest.fn();
describe("Footer", () => {

    beforeEach(() => {
        localStorage.setItem("user", JSON.stringify({ username: "testuser" }));
        mockNavigate.mockClear();
    });

    it("renders correctly", () => {
        render(<Footer />, { wrapper: MemoryRouter });

        expect(screen.getByText("Let's Get Lyrical")).toBeInTheDocument();
    });
})
