import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import axios from "axios";
import ComparePage from "./ComparePage";
jest.mock("axios");
import { mergeSongs } from "./ComparePage";
const mockUser = { username: "testuser" };

const mockSuggestions = ["alice", "bob", "carol"];
const mockFavorites = {
    alice: [
        { id: "1", title: "Song A", artist: "Artist A", releaseDate: "2020-01-01" },
        { id: "2", title: "Song B", artist: "Artist B", releaseDate: "2020-01-02" },
    ],
    bob: [
        { id: "1", title: "Song A", artist: "Artist A", releaseDate: "2020-01-01" },
        { id: "3", title: "Song C", artist: "Artist C", releaseDate: "2020-01-03" },
    ],
    carol: [
        { id: "4", title: "Hover Tune", artist: "Hoverer", releaseDate: "2019-01-01" },
    ],
};

describe("FriendsPage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        Object.defineProperty(window, "location", {
            value: { reload: jest.fn() },
            writable: true,
        });
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    test("renders input and headings", () => {
        render(<ComparePage user={mockUser} />);
        expect(screen.getByPlaceholderText("Search by username")).toBeInTheDocument();
        expect(screen.getByText("Find Friends")).toBeInTheDocument();
        expect(screen.getByText("Favorite Songs by Everyone")).toBeInTheDocument();
    });

    test("displays suggestions from API", async () => {
        axios.get.mockResolvedValueOnce({ data: mockSuggestions });

        render(<ComparePage user={mockUser} />);
        fireEvent.change(screen.getByPlaceholderText("Search by username"), {
            target: { value: "a" },
        });

        await waitFor(() => {
            mockSuggestions.forEach((name) => {
                expect(screen.getByText(name)).toBeInTheDocument();
            });
        });
    });
    test("logs out after 60 seconds of inactivity", async () => {
        render(<ComparePage user={mockUser} />);

        // Fast-forward time by 61 seconds
        jest.advanceTimersByTime(61000);

        await waitFor(() => {
            expect(window.location.reload).toHaveBeenCalled();
        });

        // Optional: check localStorage clearing logic
        expect(localStorage.getItem("user")).toBeNull();
    });

    test("selects and unselects suggestions", async () => {
        axios.get.mockResolvedValueOnce({ data: mockSuggestions });

        render(<ComparePage user={mockUser} />);
        fireEvent.change(screen.getByPlaceholderText("Search by username"), {
            target: { value: "a" },
        });

        await waitFor(() => {
            expect(screen.getByText("alice")).toBeInTheDocument();
        });

        const aliceRow = screen.getByText("alice").closest("li");
        const aliceCheckbox = within(aliceRow).getByRole("checkbox");

        fireEvent.click(aliceCheckbox);
        expect(aliceCheckbox).toBeChecked();

        fireEvent.click(aliceCheckbox);
        expect(aliceCheckbox).not.toBeChecked();
    });

    test("adds selected users and merges songs", async () => {
        axios.get
            .mockResolvedValueOnce({ data: mockSuggestions }) // suggestions
            .mockResolvedValueOnce({ data: mockFavorites["alice"] }) // alice favorites
            .mockResolvedValueOnce({ data: mockFavorites["bob"] }); // bob favorites

        render(<ComparePage user={mockUser} />);
        fireEvent.change(screen.getByPlaceholderText("Search by username"), {
            target: { value: "a" },
        });

        await waitFor(() => {
            expect(screen.getByText("alice")).toBeInTheDocument();
        });

        const aliceRow = screen.getByText("alice").closest("li");
        const bobRow = screen.getByText("bob").closest("li");
        fireEvent.click(within(aliceRow).getByRole("checkbox"));
        fireEvent.click(within(bobRow).getByRole("checkbox"));

        fireEvent.click(screen.getByRole('button', { name: /compare selected/i }));

        await waitFor(() => {
            expect(screen.getByText("Song A")).toBeInTheDocument();
            expect(screen.getByText("Song B")).toBeInTheDocument();
            expect(screen.getByText("Song C")).toBeInTheDocument();
        });
    });

    test("toggles song detail info", async () => {
        axios.get
            .mockResolvedValueOnce({ data: ["alice"] })
            .mockResolvedValueOnce({
                data: [
                    { id: "99", title: "Mystery Song", artistName: "X", releaseDate: "2022-01-01" },
                ],
            });

        render(<ComparePage user={mockUser} />);
        fireEvent.change(screen.getByPlaceholderText("Search by username"), {
            target: { value: "a" },
        });

        await waitFor(() => screen.getByText("alice"));
        const aliceRow = screen.getByText("alice").closest("li");
        fireEvent.click(within(aliceRow).getByRole("checkbox"));
        fireEvent.click(screen.getByRole('button', { name: /compare selected/i }));

        await waitFor(() => screen.getByText("Mystery Song"));

        fireEvent.click(screen.getByText("Mystery Song"));
        expect(screen.getByText("Artist: X")).toBeInTheDocument();
        expect(screen.getByText("Release Date: 2022-01-01")).toBeInTheDocument();
    });

    test("hover shows usernames", async () => {
        axios.get
            .mockResolvedValueOnce({ data: ["carol"] })
            .mockResolvedValueOnce({ data: mockFavorites["carol"] });

        render(<ComparePage user={mockUser} />);
        fireEvent.change(screen.getByPlaceholderText("Search by username"), {
            target: { value: "c" },
        });

        await waitFor(() => screen.getByText("carol"));
        const carolRow = screen.getByText("carol").closest("li");
        fireEvent.click(within(carolRow).getByRole("checkbox"));
        fireEvent.click(screen.getByRole('button', { name: /compare selected/i }));

        await waitFor(() => screen.getByText("Hover Tune"));

        const friendText = screen.getByText(/friend\(s\) have this song/);
        fireEvent.mouseEnter(friendText);

        await waitFor(() => {
            expect(screen.getByText("carol")).toBeInTheDocument();
        });
    });

    test("handles API error gracefully", async () => {
        axios.get.mockRejectedValueOnce(new Error("Failed"));

        render(<ComparePage user={mockUser} />);
        fireEvent.change(screen.getByPlaceholderText("Search by username"), {
            target: { value: "err" },
        });

        await waitFor(() => {
            expect(screen.queryByText("err")).not.toBeInTheDocument();
        });
    });
    test("clicking a suggestion sets search input", async () => {
        axios.get
            .mockResolvedValueOnce({ data: mockSuggestions }) // For initial 'a' search
            .mockResolvedValueOnce({ data: [] }); // For subsequent 'alice' search

        render(<ComparePage user={{ username: "me" }} />);
        const input = screen.getByPlaceholderText("Search by username");

        fireEvent.change(input, { target: { value: "a" } });

        await waitFor(() => {
            expect(screen.getByText("alice")).toBeInTheDocument();
        });

        // Find the list item containing "alice"
        const aliceListItem = screen.getByText("alice").closest("li");
        // Click the span within that list item
        fireEvent.click(within(aliceListItem).getByText("alice"));

        // Verify searchInput gets updated to "alice" after waiting
        await waitFor(() => expect(input).toHaveValue("alice"), { timeout: 3000 });
    });
    test("logs error when fetching favorites fails", async () => {
        // Mock the search suggestions response
        axios.get
            .mockResolvedValueOnce({ data: ["bob"] }) // suggestions
            .mockRejectedValueOnce(new Error("Network error")); // simulate failure when fetching favorites

        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        render(<ComparePage user={mockUser} />);
        fireEvent.change(screen.getByPlaceholderText("Search by username"), {
            target: { value: "b" },
        });

        await waitFor(() => screen.getByText("bob"));

        const bobRow = screen.getByText("bob").closest("li");
        fireEvent.click(within(bobRow).getByRole("checkbox"));

        fireEvent.click(screen.getByRole('button', { name: /compare selected/i }));

        await waitFor(() => {
            expect(consoleErrorSpy).toHaveBeenCalledWith("Error loading favorites for bob");
        });

        consoleErrorSpy.mockRestore();
    });
    test("clicking suggestion span sets search input", async () => {
        axios.get
            .mockResolvedValueOnce({ data: ["alice", "bob"] }) // For initial 'a' search
            .mockResolvedValueOnce({ data: [] }); // For subsequent 'alice' search

        render(<ComparePage user={{ username: "me" }} />);
        const input = screen.getByPlaceholderText("Search by username");

        // Trigger search input
        fireEvent.change(input, { target: { value: "a" } });

        // Wait for suggestions to appear
        await waitFor(() => expect(screen.getByText("alice")).toBeInTheDocument());

        // Find the list item containing "alice"
        const aliceListItem = screen.getByText("alice").closest("li");
        // Click the suggestion span (not checkbox) within that list item
        fireEvent.click(within(aliceListItem).getByText("alice"));

        // The input should now update to "alice"
        await waitFor(() => expect(input).toHaveValue("alice"), { timeout: 3000 });
    });
    test("hovering friend count shows usernames", async () => {
        const mockUser = { username: "testuser" };
        const mockSuggestions = ["carol"];
        const mockCarolFavorites = [
            {
                id: "101",
                title: "Hover Song",
                artist: "Hover Artist",
                releaseDate: "2021-12-01",
            },
        ];

        // Step 1: Mock both suggestions and carol's favorites
        axios.get
            .mockResolvedValueOnce({ data: mockSuggestions }) // for search
            .mockResolvedValueOnce({ data: mockCarolFavorites }); // for favorites

        render(<ComparePage user={mockUser} />);

        // Step 2: Trigger suggestion dropdown
        fireEvent.change(screen.getByPlaceholderText("Search by username"), {
            target: { value: "c" },
        });

        await waitFor(() => screen.getByText("carol"));

        // Step 3: Select checkbox for carol
        const carolRow = screen.getByText("carol").closest("li");
        fireEvent.click(within(carolRow).getByRole("checkbox"));

        // Step 4: Click Add Selected to fetch and render carol's songs
        fireEvent.click(screen.getByRole('button', { name: /compare selected/i }));

        // Step 5: Wait for song to appear
        await waitFor(() => {
            expect(screen.getByText("Hover Song")).toBeInTheDocument();
        });

        // Step 6: Hover over the "1 friend(s) have this song" text
        const hoverDiv = screen.getByText(/friend\(s\) have this song/i).closest("div");
        fireEvent.mouseEnter(hoverDiv);

        // Step 7: Username should now be visible
        expect(screen.getByText("carol")).toBeInTheDocument();

        // Step 8: Unhover and confirm it's hidden
        fireEvent.mouseLeave(hoverDiv);
        await waitFor(() => {
            expect(screen.queryByText("carol")).toBeNull();
        });
    });

    test("adds second user to existing song in mergeSongs", async () => {
        const mockSuggestions = ["alice", "bob"];
        const sharedSong = {
            id: "42",
            title: "The Shared Hit",
            artist: "The Band",
            releaseDate: "2023-01-01",
        };

        axios.get
            .mockResolvedValueOnce({ data: mockSuggestions }) // suggestions list
            .mockResolvedValueOnce({ data: [sharedSong] })    // alice's favorites
            .mockResolvedValueOnce({ data: [sharedSong] });   // bob's favorites

        render(<ComparePage user={{ username: "me" }} />);

        fireEvent.change(screen.getByPlaceholderText("Search by username"), {
            target: { value: "a" },
        });

        await waitFor(() => {
            expect(screen.getByText("alice")).toBeInTheDocument();
        });

        const aliceRow = screen.getByText("alice").closest("li");
        const bobRow = screen.getByText("bob").closest("li");

        fireEvent.click(within(aliceRow).getByRole("checkbox"));
        fireEvent.click(within(bobRow).getByRole("checkbox"));

        fireEvent.click(screen.getByRole('button', { name: /compare selected/i }));

        // Song should be shown once
        await waitFor(() => {
            expect(screen.getByText("The Shared Hit")).toBeInTheDocument();
        });

        // Hover to confirm both usernames were merged
        const hoverTarget = screen.getByText(/friend\(s\) have this song/i).closest("div");
        fireEvent.mouseEnter(hoverTarget);

        // ✅ This confirms the user list contains both, meaning the merge logic and "else" path ran
        expect(screen.getByText("alice")).toBeInTheDocument();
        expect(screen.getByText("bob")).toBeInTheDocument();
    });
    test("mergeSongs does not re-add user if already exists", () => {
        const song = { id: "777", title: "Repeat Song" };
        let map = {};

        // Add once
        map = mergeSongs("alice", [song], map);
        // Add again
        map = mergeSongs("alice", [song], map);

        expect(map["777"].users).toEqual(["alice"]); // no duplicate
    });
    test("does nothing when user is not provided", async () => {
        const axiosSpy = jest.spyOn(axios, "get");

        render(<ComparePage user={null} />);

        // Basic UI should still render
        expect(screen.getByText("Find Friends")).toBeInTheDocument();
        expect(screen.getByText("Favorite Songs by Everyone")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Search by username")).toBeInTheDocument();

        // Axios should not be called
        expect(axiosSpy).not.toHaveBeenCalled();

        // "Add Selected" button should be there but disabled
        const addButton = screen.getByRole('button', { name: /compare selected/i });
        expect(addButton).toBeInTheDocument();
        expect(addButton).toBeDisabled();
    });

});
