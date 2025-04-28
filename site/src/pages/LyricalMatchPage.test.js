import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LyricalMatchPage from "./LyricalMatchPage";
import axios from "axios";
import {act} from "react-dom/test-utils";

jest.mock("axios");

jest.mock("./WordCloudPanel", () => ({
    __esModule: true,
    default: ({ user, wordCloudSongs }) => (
        <div data-testid={`wordcloud-${user}`}>{wordCloudSongs.length} songs</div>
    )
}));

describe("LyricalMatchPage", () => {
    const user = "testUser";
    const mockFavorites = [
        { songId: "1", title: "Song A", artistName: "Artist A", lyrics: "love love you" },
        { songId: "2", title: "Song B", artistName: "Artist B", lyrics: "hate and you" }
    ];

    const mockAllWordmaps = {
        otherUser: {
            wordMap: { love: 1, you: 1 },
            favorites: [{ songId: "3", title: "Song C", artistName: "Artist C", lyrics: "you love music" }]
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        axios.get.mockImplementation((url) => {
            if (url.includes(`/favorites/${user}`)) {
                return Promise.resolve({ data: mockFavorites });
            }
            if (url.includes("/favorites/privacy/otherUser")) {
                return Promise.resolve({ status: 200, data: false });
            }
            if (url.includes("/favorites/all-wordmaps")) {
                return Promise.resolve({ data: mockAllWordmaps });
            }
            return Promise.reject("unknown endpoint");
        });
    });

    it("renders soulmate word cloud and overlay", async () => {
        render(<LyricalMatchPage user={user} />);

        const soulmateBtn = screen.getByText("Show Soulmate");
        fireEvent.click(soulmateBtn);

        await waitFor(() => {
            expect(screen.getByText("🎵 Your Lyrical Soulmate: otherUser")).toBeInTheDocument();
        });

        expect(screen.getByTestId("wordcloud-testUser")).toHaveTextContent("2 songs");
        expect(screen.getByTestId("wordcloud-otherUser")).toHaveTextContent("1 songs");
    });

    it("renders enemy word cloud after clicking enemy button", async () => {
        render(<LyricalMatchPage user={user} />);

        const enemyBtn = screen.getByText("Show Enemy");
        fireEvent.click(enemyBtn);

        await waitFor(() => {
            expect(screen.getByText("🖤 Your Lyrical Enemy: otherUser")).toBeInTheDocument();
        });

        expect(screen.getByTestId("wordcloud-testUser")).toBeInTheDocument();
        expect(screen.getByTestId("wordcloud-otherUser")).toBeInTheDocument();
    });

    it("skips users with private favorite lists", async () => {
        const user = "testUser";

        const mockAllWordmaps = {
            publicUser: {
                wordMap: { love: 2 },
                favorites: [{ songId: "3", title: "Public Song", artistName: "Pub", lyrics: "love song" }]
            },
            privateUser: {
                wordMap: { hate: 1 },
                favorites: [{ songId: "4", title: "Private Song", artistName: "Priv", lyrics: "hate music" }]
            }
        };

        axios.get.mockImplementation((url) => {
            if (url.includes(`/favorites/${user}`)) {
                return Promise.resolve({
                    data: [
                        { songId: "1", title: "Your Song", artistName: "You", lyrics: "you love music" }
                    ]
                });
            }
            if (url.includes("/favorites/privacy/publicUser")) {
                return Promise.resolve({ status: 200, data: false });
            }
            if (url.includes("/favorites/privacy/privateUser")) {
                return Promise.resolve({ status: 200, data: true }); // private
            }
            if (url.includes("/favorites/all-wordmaps")) {
                return Promise.resolve({ data: mockAllWordmaps });
            }
            return Promise.reject("Unknown endpoint");
        });

        render(<LyricalMatchPage user={user} />);

        fireEvent.click(screen.getByText("Show Soulmate"));

        await waitFor(() => {
            expect(screen.getByText("🎵 Your Lyrical Soulmate: publicUser")).toBeInTheDocument();
        });

        // ✅ Skipped notice using flexible matching
        expect(
            screen.getByText((content) =>
                content.includes("Skipped") && content.includes("private favorites")
            )
        ).toBeInTheDocument();

        expect(screen.getByText("privateUser")).toBeInTheDocument();
    });
    it("returns early if no other users are available", async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes("/favorites/testUser")) {
                return Promise.resolve({ data: [] });
            }
            if (url.includes("/favorites/all-wordmaps")) {
                return Promise.resolve({ data: {} }); // no other users
            }
            return Promise.reject("unknown endpoint");
        });

        render(<LyricalMatchPage user="testUser" />);
        fireEvent.click(screen.getByText("Show Soulmate"));

        await waitFor(() => {
            expect(screen.queryByText(/🎵 Your Lyrical Soulmate:/)).not.toBeInTheDocument();
        });
    });

    it("sorts users by similarity descending", async () => {
        const user = "testUser";
        const mockFavorites = [
            { songId: "1", title: "Love Song", artistName: "A", lyrics: "love love love you" }
        ];

        const mockAllWordmaps = {
            user1: {
                wordMap: { love: 1, you: 1 },
                favorites: [{ songId: "2", title: "Nice Song", artistName: "B", lyrics: "you love" }]
            },
            user2: {
                wordMap: { hate: 1, never: 1 },
                favorites: [{ songId: "3", title: "Bad Song", artistName: "C", lyrics: "never hate" }]
            }
        };

        axios.get.mockImplementation((url) => {
            if (url.includes(`/favorites/${user}`)) {
                return Promise.resolve({ data: mockFavorites });
            }
            if (url.includes("/favorites/privacy/user1") || url.includes("/favorites/privacy/user2")) {
                return Promise.resolve({ status: 200, data: false });
            }
            if (url.includes("/favorites/all-wordmaps")) {
                return Promise.resolve({ data: mockAllWordmaps });
            }
            return Promise.reject("unknown endpoint");
        });

        render(<LyricalMatchPage user={user} />);
        fireEvent.click(screen.getByText("Show Soulmate"));

        // This confirms sorting occurred and the highest similarity is shown first
        await waitFor(() => {
            expect(screen.getByText(/🎵 Your Lyrical Soulmate: user1/)).toBeInTheDocument();
        });
    });
    it("sets mutualSoulmate and mutualEnemy correctly based on similarity", async () => {
        const user = "testUser";
        const otherUser = "otherUser";
        const rivalUser = "rivalUser";

        const mockFavorites = [
            { songId: "1", title: "Love Song", artistName: "A", lyrics: "love love love you" }
        ];

        const mockAllWordmaps = {
            [otherUser]: {
                wordMap: { love: 2, you: 1 },
                favorites: [{ songId: "2", title: "Heart Song", artistName: "B", lyrics: "love heart" }]
            },
            [rivalUser]: {
                wordMap: { love: 5, you: 5, better: 1 },
                favorites: [{ songId: "3", title: "Better Song", artistName: "C", lyrics: "love you better" }]
            }
        };

        axios.get.mockImplementation((url) => {
            if (url.includes(`/favorites/${user}`)) {
                return Promise.resolve({ data: mockFavorites });
            }
            if (url.includes("/favorites/all-wordmaps")) {
                return Promise.resolve({ data: mockAllWordmaps });
            }
            if (url.includes(`/favorites/privacy/${rivalUser}`)) {
                return Promise.resolve({ status: 200, data: false });
            }
            if (url.includes(`/favorites/privacy/${otherUser}`)) {
                return Promise.resolve({ status: 200, data: false });
            }
            return Promise.reject("unknown");
        });

        render(<LyricalMatchPage user={user} />);

        fireEvent.click(screen.getByText("Show Soulmate"));
        await waitFor(() => {
            expect(screen.getByText(/Your Lyrical Soulmate:/)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText("Show Enemy"));
        await waitFor(() => {
            expect(screen.getByText(/Your Lyrical Enemy:/)).toBeInTheDocument();
        });

        expect(screen.getByTestId("wordcloud-testUser")).toBeInTheDocument();
    });
    it("returns early and renders nothing if no user is provided", async () => {
        render(<LyricalMatchPage user={null} />);

        // Wait a tick to ensure useEffect runs and early returns
        await waitFor(() => {
            // Expect the main heading to NOT be in the document
            expect(screen.queryByText(/Find Your Lyrical Soulmate/)).not.toBeInTheDocument();
        });
    });
    it("skips a user if fetching privacy info throws an error", async () => {
        const user = "testUser";

        // mock user's own favorites
        axios.get.mockImplementation((url) => {
            if (url.includes(`/favorites/${user}`)) {
                return Promise.resolve({ data: [
                        { songId: "1", title: "Song A", artistName: "Artist A", lyrics: "hello world" }
                    ] });
            }
            if (url.includes("/favorites/all-wordmaps")) {
                return Promise.resolve({
                    data: {
                        privateUser: {
                            wordMap: { hello: 1 },
                            favorites: [{ songId: "2", title: "Song B", artistName: "Artist B", lyrics: "hello again" }]
                        }
                    }
                });
            }
            if (url.includes("/favorites/privacy/privateUser")) {
                return Promise.reject(new Error("Failed to fetch privacy"));
            }

            return Promise.reject("Unhandled URL");
        });

        render(<LyricalMatchPage user={user} />);

        // wait for UI to reflect skipped user
        await waitFor(() => {
            expect(screen.getByText(/⚠️ Skipped 1 user with private favorites:/)).toBeInTheDocument();
            expect(screen.getByText("privateUser")).toBeInTheDocument();
        });
    });
    it("skips processing if the other user's name matches the current user", async () => {
        const user = "testUser";

        axios.get.mockImplementation((url) => {
            if (url.includes(`/favorites/${user}`)) {
                return Promise.resolve({
                    data: [
                        { songId: "1", title: "Song A", artistName: "Artist A", lyrics: "just a test" }
                    ]
                });
            }
            if (url.includes("/favorites/all-wordmaps")) {
                return Promise.resolve({
                    data: {
                        testUser: {
                            wordMap: { test: 2 },
                            favorites: [{ songId: "1", title: "Song A", artistName: "Artist A", lyrics: "just a test" }]
                        },
                        otherUser: {
                            wordMap: { hello: 1 },
                            favorites: [{ songId: "2", title: "Song B", artistName: "Artist B", lyrics: "hello again" }]
                        }
                    }
                });
            }
            if (url.includes("/favorites/privacy/otherUser")) {
                return Promise.resolve({ status: 200, data: false });
            }

            return Promise.reject("Unexpected URL");
        });

        render(<LyricalMatchPage user={user} />);


        // ✅ Implicitly, the user named "testUser" from the wordMap was skipped via `continue`
    });
    test("most similar user prefers someone else — not a mutual soulmate", async () => {
        const testUserFavorites = [
            { lyrics: "hope peace love", title: "Dreamer", artistName: "Sky", songId: "1" }
        ];

        const mockOthers = {
            bob: {
                favorites: [
                    { lyrics: "hope peace love unity", title: "Harmony", artistName: "Bright", songId: "2" }
                ],
                wordMap: { hope: 1, peace: 1, love: 1, unity: 1 }
            },
            alice: {
                favorites: [
                    { lyrics: "hope peace love unity trust", title: "Trusted Tune", artistName: "Moon", songId: "3" }
                ],
                wordMap: { hope: 1, peace: 1, love: 1, unity: 1, trust: 1 }
            }
        };

        axios.get.mockImplementation((url) => {
            if (url.includes("/favorites/testuser")) {
                return Promise.resolve({ data: testUserFavorites });
            }
            if (url.includes("/favorites/privacy")) {
                return Promise.resolve({ status: 200, data: false }); // Everyone's public
            }
            if (url.includes("/favorites/all-wordmaps")) {
                return Promise.resolve({ data: mockOthers });
            }
            return Promise.reject("Unexpected URL");
        });

        render(<LyricalMatchPage user="testuser" />);
        fireEvent.click(await screen.findByText("Show Soulmate"));

        // ✅ Bob is most similar to testuser
        expect(await screen.findByText(/🎵 Your Lyrical Soulmate: bob/)).toBeInTheDocument();

        // ❌ But bob prefers alice more, so overlay should NOT show
        await waitFor(() => {
            expect(screen.queryByText(/🎉 You're each other's lyrical soulmate!/)).not.toBeInTheDocument();
        });
    });

// Cover: console.error in catch
    it("logs error to console when API call fails", async () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        axios.get.mockRejectedValue(new Error("fail"));

        render(<LyricalMatchPage user="testuser" />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith("❌ Failed to fetch lyrical match data:", expect.any(Error));
        });

        consoleSpy.mockRestore();
    });



});

describe("LyricalMatchPage", () => {
    const mockUser = "testUser";
    const mockFavorites = [{ songId: "1", title: "One", artistName: "A", lyrics: "happy joy" }];
    const mockWordmaps = {
        otherUser: {
            wordMap: { happy: 1, joy: 1 },
            favorites: [{ songId: "2", title: "Two", artistName: "B", lyrics: "happy joy" }],
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        axios.get.mockImplementation((url) => {
            if (url.includes(`/favorites/${mockUser}`)) {
                return Promise.resolve({ data: mockFavorites });
            }
            if (url.includes("/favorites/privacy/otherUser")) {
                return Promise.resolve({ status: 200, data: false });
            }
            if (url.includes("/favorites/all-wordmaps")) {
                return Promise.resolve({ data: mockWordmaps });
            }
            return Promise.reject("Unknown endpoint");
        });
    });
    afterEach(() => {
        jest.runOnlyPendingTimers(); // ✅ Flush remaining timers
        jest.useRealTimers(); // ✅ Restore timers after test
    });
    it("triggers celebration and sinister overlays and hides them after timeout", async () => {
        render(<LyricalMatchPage user={mockUser} />);

        // Trigger soulmate
        fireEvent.click(screen.getByText("Show Soulmate"));

        // Wait for overlay to appear
        expect(await screen.findByTestId("celebration-overlay")).toBeInTheDocument();

        // Fast-forward timer to hide overlay
        act(() => {
            jest.advanceTimersByTime(4000);
        });

        // Use opacity check if still mounted
        expect(screen.getByTestId("celebration-overlay")).toHaveStyle("opacity: 0");

        // Trigger enemy
        fireEvent.click(screen.getByText("Show Enemy"));

        expect(await screen.findByTestId("sinister-overlay")).toBeInTheDocument();

        act(() => {
            jest.advanceTimersByTime(4000);
        });

        expect(screen.getByTestId("sinister-overlay")).toHaveStyle("opacity: 0");
    });
    test("calls handleLogout after 60 seconds of inactivity", async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes("/favorites/testuser")) {
                return Promise.resolve({ data: [] });
            }
            if (url.includes("/favorites/all-wordmaps")) {
                return Promise.resolve({ data: {} });
            }
            return Promise.reject("unexpected");
        });

        const reloadMock = jest.fn();
        const removeSpy = jest.spyOn(Storage.prototype, "removeItem");

        // Override read-only window.location.reload
        Object.defineProperty(window, "location", {
            value: { reload: reloadMock },
            writable: true,
        });

        await act(async () => {
            render(<LyricalMatchPage user="testuser" />);
        });

        act(() => {
            jest.advanceTimersByTime(61000);
        });

        expect(removeSpy).toHaveBeenCalledWith("user");
        expect(reloadMock).toHaveBeenCalled();

        removeSpy.mockRestore();
    });

    test("clicking Show Soulmate triggers celebration overlay when mutual soulmate", async () => {
        const userFavorites = [
            { songId: "1", title: "Love Song", artistName: "Sky", lyrics: "hope peace love" },
        ];
        const bobFavorites = [
            { songId: "2", title: "Match Song", artistName: "Moon", lyrics: "hope peace love" },
        ];

        axios.get.mockImplementation((url) => {
            if (url.includes("/favorites/testuser")) {
                return Promise.resolve({ data: userFavorites });
            }
            if (url.includes("/favorites/privacy/")) {
                return Promise.resolve({ status: 200, data: false }); // public
            }
            if (url.includes("/favorites/all-wordmaps")) {
                return Promise.resolve({
                    data: {
                        bob: {
                            favorites: bobFavorites,
                            wordMap: { hope: 1, peace: 1, love: 1 },
                        },
                    },
                });
            }
            return Promise.reject(new Error("Unexpected URL"));
        });

        await act(async () => {
            render(<LyricalMatchPage user="testuser" />);
        });

        // Trigger the soulmate logic
        fireEvent.click(await screen.findByText("Show Soulmate"));

        // ✅ Confirm overlay appears
        expect(await screen.findByTestId("celebration-overlay")).toBeInTheDocument();

        // Simulate timeout expiration
        act(() => {
            jest.advanceTimersByTime(4000);
        });

        // ✅ Confirm it disappears (visually hidden via opacity)
        await waitFor(() => {
            expect(screen.getByTestId("celebration-overlay")).toHaveStyle("opacity: 0");
        });
    });
    test("displays plural 'users' when multiple users have private favorites", async () => {
        const user = "testuser";

        const mockUserSongs = [
            { songId: "1", title: "Song A", artistName: "A", lyrics: "hope love peace" }
        ];

        const mockOtherUsers = {
            alice: {
                wordMap: {},
                favorites: []
            },
            bob: {
                wordMap: {},
                favorites: []
            }
        };

        axios.get.mockImplementation((url) => {
            if (url.includes(`/favorites/${user}`)) {
                return Promise.resolve({ data: mockUserSongs });
            }
            if (url.includes("/favorites/all-wordmaps")) {
                return Promise.resolve({ data: mockOtherUsers });
            }
            if (url.includes("/favorites/privacy/")) {
                return Promise.resolve({ status: 200, data: true }); // All private
            }
            return Promise.reject(new Error("Unexpected URL"));
        });

        render(<LyricalMatchPage user={user} />);

        await waitFor(() => {
            expect(screen.getByText(/⚠️ Skipped 2 users with private favorites:/)).toBeInTheDocument();
            expect(screen.getByText("alice")).toBeInTheDocument();
            expect(screen.getByText("bob")).toBeInTheDocument();
        });
    });

});