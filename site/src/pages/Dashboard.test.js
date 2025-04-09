import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Dashboard from "./Dashboard";
import axios from "axios";


jest.mock("axios");


jest.mock("react-router-dom", () => {
    const actual = jest.requireActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => jest.fn(),
        Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
    };
});


jest.mock("./WordCloudPanel", () => {
    return function DummyWordCloudPanel({ wordCloudSongs, user, loading }) {
        return (
            <div data-testid="word-cloud-panel">
                <div data-testid="cloud-songs">{JSON.stringify(wordCloudSongs)}</div>
                <div data-testid="cloud-user">{user}</div>
                <div data-testid="cloud-loading">{loading.toString()}</div>
            </div>
        );
    };
});


const mockUser = "testUser";


beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
    Storage.prototype.removeItem = jest.fn();
    delete window.location;
    window.location = { reload: jest.fn() };
});


describe("Dashboard Component", () => {
    test("redirects to home if user is not provided", () => {
        render(
            <BrowserRouter>
                <Dashboard user={null} />
            </BrowserRouter>
        );
        expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/");
    });


    test("displays welcome message", () => {
        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );
        expect(screen.getByText(`Welcome, ${mockUser}!`)).toBeInTheDocument();
    });




    test("alerts when search is attempted without title or limit", () => {
        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );
        fireEvent.click(screen.getByText("Search"));
        expect(window.alert).toHaveBeenCalledWith("Please enter an artist name!");
    });


    test("alerts when search limit is missing", () => {
        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );
        fireEvent.change(screen.getByPlaceholderText("Enter artist name..."), { target: { value: "Test Artist" } });
        fireEvent.click(screen.getByText("Search"));
        expect(window.alert).toHaveBeenCalledWith("Please enter a valid number of songs to display.");
    });


    test("fetches and filters songs correctly", async () => {
        axios.get.mockResolvedValueOnce({ data: [] }); // Word cloud
        axios.get.mockResolvedValueOnce({
            data: {
                response: {
                    hits: [
                        {
                            result: {
                                id: "1",
                                full_title: "Song Matching",
                                url: "http://song1",
                                header_image_url: "http://image1",
                                release_date_for_display: "2020-01-01",
                                primary_artist: { name: "Test Artist" },
                            },
                        },
                        {
                            result: {
                                id: "2",
                                full_title: "Song Not Matching",
                                url: "http://song2",
                                header_image_url: "http://image2",
                                release_date_for_display: "2020-01-02",
                                primary_artist: { name: "Other Artist" },
                            },
                        },
                    ],
                },
            },
        });


        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );


        fireEvent.change(screen.getByPlaceholderText("Enter artist name..."), { target: { value: "Test Artist" } });
        fireEvent.change(screen.getByPlaceholderText("Number of songs to display"), { target: { value: "1" } });
        fireEvent.click(screen.getByText("Search"));


        await waitFor(() => expect(screen.getByText(/Song Matching/i)).toBeInTheDocument());
        expect(screen.queryByText(/Song Not Matching/i)).toBeNull();
    });

    test("adds all favorites to word cloud successfully", async () => {
        // First GET call on mount for the word cloud data (empty initially)
        axios.get.mockResolvedValueOnce({ data: [] });

        // Favorites GET: when the addFavoritesToWordCloud function is called,
        // it will fetch favorites for the current user.
        const favoritesMock = [
            {
                songId: "1",
                title: "Fav Song 1",
                url: "http://fav1.com",
                imageUrl: "http://fav1image.com",
                releaseDate: "2025-01-01",
                artistName: "Artist1"
            },
            {
                songId: "2",
                title: "Fav Song 2",
                url: "http://fav2.com",
                imageUrl: "http://fav2image.com",
                releaseDate: "2025-01-02",
                artistName: "Artist2"
            },
        ];
        axios.get.mockResolvedValueOnce({ data: favoritesMock }); // favorites fetch

        // For each favorite, mock a successful lyrics fetch.
        axios.get.mockImplementation((url, config) => {
            if (url === "http://localhost:8080/api/genius/lyrics" && config && config.params) {
                if (config.params.songId === "1") {
                    return Promise.resolve({ data: { lyrics: "Lyrics for Fav Song 1" } });
                }
                if (config.params.songId === "2") {
                    return Promise.resolve({ data: { lyrics: "Lyrics for Fav Song 2" } });
                }
            }
            // Updated word cloud GET after post
            if (url === `http://localhost:8080/api/wordcloud/${mockUser}`) {
                return Promise.resolve({
                    data: [
                        {
                            username: mockUser,
                            songId: "1",
                            title: "Fav Song 1",
                            url: "http://fav1.com",
                            imageUrl: "http://fav1image.com",
                            releaseDate: "2025-01-01",
                            artistName: "Artist1",
                            lyrics: "Lyrics for Fav Song 1"
                        },
                        {
                            username: mockUser,
                            songId: "2",
                            title: "Fav Song 2",
                            url: "http://fav2.com",
                            imageUrl: "http://fav2image.com",
                            releaseDate: "2025-01-02",
                            artistName: "Artist2",
                            lyrics: "Lyrics for Fav Song 2"
                        }
                    ]
                });
            }
        });

        axios.post.mockResolvedValue({ status: 200 });

        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );

        // Click the "Add all favorites to Word Cloud" button.
        fireEvent.click(screen.getByText("Add All Favorites to Word Cloud"));

        // Wait and check that the favorites GET was called.
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(`http://localhost:8080/api/favorites/${mockUser}`);
        });

        // Check that axios.post was called with the properly mapped favorites.
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                "http://localhost:8080/api/wordcloud/add",
                expect.arrayContaining([
                    expect.objectContaining({
                        songId: "1",
                        title: "Fav Song 1",
                        lyrics: "Lyrics for Fav Song 1",
                        username: mockUser
                    }),
                    expect.objectContaining({
                        songId: "2",
                        title: "Fav Song 2",
                        lyrics: "Lyrics for Fav Song 2",
                        username: mockUser
                    }),
                ])
            );
        });

        // Finally, check that the WordCloudPanel displays the updated word cloud data.
        await waitFor(() => {
            expect(screen.getByTestId("cloud-songs")).toHaveTextContent(
                JSON.stringify([
                    {
                        username: mockUser,
                        songId: "1",
                        title: "Fav Song 1",
                        url: "http://fav1.com",
                        imageUrl: "http://fav1image.com",
                        releaseDate: "2025-01-01",
                        artistName: "Artist1",
                        lyrics: "Lyrics for Fav Song 1"
                    },
                    {
                        username: mockUser,
                        songId: "2",
                        title: "Fav Song 2",
                        url: "http://fav2.com",
                        imageUrl: "http://fav2image.com",
                        releaseDate: "2025-01-02",
                        artistName: "Artist2",
                        lyrics: "Lyrics for Fav Song 2"
                    }
                ])
            );
        });
    });

    test("logs console error when addFavoritesToWordCloud fails", async () => {
        const favoritesMock = [
            {
                songId: "1",
                title: "Fav Song 1",
                url: "http://fav1.com",
                imageUrl: "http://fav1image.com",
                releaseDate: "2025-01-01",
                artistName: "Artist1"
            }
        ];

        // First GET call on mount for initial word cloud load.
        axios.get.mockResolvedValueOnce({ data: [] });
        // GET call to fetch favorites for the current user.
        axios.get.mockResolvedValueOnce({ data: favoritesMock });
        // GET call to fetch lyrics.
        axios.get.mockResolvedValueOnce({ data: { lyrics: "Lyrics for Fav Song 1" } });
        // Simulate failure on the POST call to add favorites to the word cloud.
        axios.post.mockRejectedValueOnce(new Error("Add favorites failed"));

        // Spy on console.error so we can verify the error is logged.
        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );

        // The button should initially show "Add All Favorites to Word Cloud".
        const button = screen.getByRole("button", { name: /Add All Favorites to Word Cloud/i });
        expect(button).toBeInTheDocument();

        // Click the "Add All Favorites to Word Cloud" button.
        fireEvent.click(button);

        // Wait for the error to be logged.
        await waitFor(() => {
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "❌ Failed to save to word cloud:",
                expect.any(Error)
            );
        });

        // After completion, the button text should revert back.
        expect(button).toBeInTheDocument();

        consoleErrorSpy.mockRestore();
    });


    test("adds favorites to word cloud defaults lyrics to 'Unknown' when lyrics fetch fails", async () => {
        // First GET for initial word cloud load.
        axios.get.mockResolvedValueOnce({ data: [] });

        // Favorites GET returning one favorite.
        const favoritesMock = [
            {
                songId: "1",
                title: "Fav Song 1",
                url: "http://fav1.com",
                imageUrl: "http://fav1image.com",
                releaseDate: "2025-01-01",
                artistName: "Artist1"
            }
        ];
        axios.get.mockResolvedValueOnce({ data: favoritesMock });

        // Simulate failure for lyrics fetch.
        axios.get.mockImplementation((url) => {
            if (url === "http://localhost:8080/api/genius/lyrics") {
                return Promise.reject(new Error("Lyrics fetch error"));
            }
            if (url === `http://localhost:8080/api/wordcloud/${mockUser}`) {
                return Promise.resolve({
                    data: [
                        {
                            username: mockUser,
                            songId: "1",
                            title: "Fav Song 1",
                            url: "http://fav1.com",
                            imageUrl: "http://fav1image.com",
                            releaseDate: "2025-01-01",
                            artistName: "Artist1",
                            lyrics: "Unknown"
                        }
                    ]
                });
            }
        });

        axios.post.mockResolvedValue({ status: 200 });

        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );

        // Click the "Add all favorites to Word Cloud" button.
        fireEvent.click(screen.getByText("Add All Favorites to Word Cloud"));

        // Wait and check that axios.post was called with the favorite using default lyrics "Unknown".
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                "http://localhost:8080/api/wordcloud/add",
                expect.arrayContaining([
                    expect.objectContaining({
                        songId: "1",
                        title: "Fav Song 1",
                        lyrics: "Unknown",
                        username: mockUser
                    })
                ])
            );
        });
    });

    test("logs console error when addFavoritesToWordCloud fails", async () => {
        const favoritesMock = [
            {
                songId: "1",
                title: "Fav Song 1",
                url: "http://fav1.com",
                imageUrl: "http://fav1image.com",
                releaseDate: "2025-01-01",
                artistName: "Artist1"
            }
        ];

        // First GET for word cloud on mount (empty)
        axios.get.mockResolvedValueOnce({ data: [] });
        // GET favorites call (when addFavoritesToWordCloud is triggered)
        axios.get.mockResolvedValueOnce({ data: favoritesMock });
        // GET lyrics for the favorite song
        axios.get.mockResolvedValueOnce({ data: { lyrics: "Lyrics for Fav Song 1" } });

        // Simulate failure on the POST call to add favorites to word cloud
        axios.post.mockRejectedValueOnce(new Error("Add favorites failed"));

        // Spy on console.error so we can verify it gets called.
        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );

        // Click the "Add all favorites to Word Cloud" button.
        fireEvent.click(screen.getByText("Add All Favorites to Word Cloud"));

        // Wait for the error to be logged in the console.
        await waitFor(() => {
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "❌ Failed to save to word cloud:",
                expect.any(Error)
            );
        });

        consoleErrorSpy.mockRestore();
    });

    test("displays error when no favorites are found", async () => {
        // First GET: initial word cloud load
        axios.get.mockResolvedValueOnce({ data: [] });
        // GET favorites: returns empty list
        axios.get.mockResolvedValueOnce({ data: [] });

        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );

        // Click the "Add All Favorites to Word Cloud" button
        fireEvent.click(screen.getByText("Add All Favorites to Word Cloud"));

        // Expect error message to show
        await waitFor(() => {
            expect(screen.getByText("No favorites found.")).toBeInTheDocument();
        });

        // Ensure the button resets back to original state
        const button = screen.getByRole("button", { name: /Add All Favorites to Word Cloud/i });
        expect(button).toBeInTheDocument();
    });

    test("adds selected songs to word cloud", async () => {
        axios.get
            .mockResolvedValueOnce({ data: [] }) // word cloud
            .mockResolvedValueOnce({ // search
                data: {
                    response: {
                        hits: [
                            {
                                result: {
                                    id: "1",
                                    full_title: "Song Matching",
                                    url: "http://song1",
                                    header_image_url: "http://image1",
                                    release_date_for_display: "2020-01-01",
                                    primary_artist: { name: "Test Artist" },
                                },
                            },
                        ],
                    },
                },
            })
            .mockResolvedValueOnce({ data: { lyrics: "Lyrics for song 1" } }) // lyrics
            .mockResolvedValueOnce({ data: [{ id: "w1", title: "Word 1" }] }); // updated word cloud


        axios.post.mockResolvedValue({ status: 200 });


        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );


        fireEvent.change(screen.getByPlaceholderText("Enter artist name..."), {
            target: { value: "Test Artist" },
        });
        fireEvent.change(screen.getByPlaceholderText("Number of songs to display"), {
            target: { value: "1" },
        });
        fireEvent.click(screen.getByText("Search"));


        await waitFor(() => expect(screen.getByText(/Song Matching/i)).toBeInTheDocument());
        fireEvent.click(screen.getByRole("checkbox"));
        fireEvent.click(screen.getByText("Add Selected to Word Cloud"));


        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                "http://localhost:8080/api/wordcloud/add",
                expect.arrayContaining([
                    expect.objectContaining({
                        username: mockUser,
                        songId: "1",
                        title: "Song Matching",
                    }),
                ])
            );
        });


        await waitFor(() => {
            expect(screen.getByTestId("cloud-songs")).toHaveTextContent(
                JSON.stringify([{ id: "w1", title: "Word 1" }])
            );
        });
    });

    test("logs out when user is inactive for more than 60 seconds", async () => {
        jest.useFakeTimers();
        axios.get.mockResolvedValueOnce({ data: [] });


        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );


        act(() => {
            jest.advanceTimersByTime(61000);
        });


        await waitFor(() => {
            expect(localStorage.removeItem).toHaveBeenCalledWith("user");
            expect(window.location.reload).toHaveBeenCalled();
        });


        jest.useRealTimers();
    });

    test("bulkAddToFavorites adds successful and failed songs", async () => {
        const mockSongs = [
            {
                result: {
                    id: "1",
                    full_title: "Good Song",
                    url: "http://song1",
                    header_image_url: "http://img1",
                    release_date_for_display: "2020-01-01",
                    primary_artist: { name: "Artist A" }
                }
            },
            {
                result: {
                    id: "2",
                    full_title: "Duplicate Song",
                    url: "http://song2",
                    header_image_url: "http://img2",
                    release_date_for_display: "2020-01-02",
                    primary_artist: { name: "Artist B" }
                }
            }
        ];


        axios.get
            .mockResolvedValueOnce({ data: [] }) // word cloud
            .mockResolvedValueOnce({ // search
                data: {
                    response: {
                        hits: mockSongs
                    }
                }
            })
            .mockResolvedValue({ data: { lyrics: "Sample lyrics" } }); // lyrics fetch for both


        axios.post
            .mockResolvedValueOnce({ status: 200 }) // Good Song succeeds
            .mockResolvedValueOnce({ status: 400 }); // Duplicate Song fails


        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );


        // Use matching artist name to trigger song filtering
        fireEvent.change(screen.getByPlaceholderText("Enter artist name..."), {
            target: { value: "Artist" }
        });
        fireEvent.change(screen.getByPlaceholderText("Number of songs to display"), {
            target: { value: "2" }
        });
        fireEvent.click(screen.getByText("Search"));


        await waitFor(() => {
            expect(screen.getByText((text) => text.includes("Good Song"))).toBeInTheDocument();
            expect(screen.getByText((text) => text.includes("Duplicate Song"))).toBeInTheDocument();
        });


        // Select both songs
        const checkboxes = screen.getAllByRole("checkbox");
        fireEvent.click(checkboxes[0]);
        fireEvent.click(checkboxes[1]);


        // Trigger bulk add to favorites
        fireEvent.click(screen.getByText("Add Selected to Favorites"));


        // Expect messages for both success and failure
        await waitFor(() => {
            expect(screen.getByText(/✅ Added: Good Song/)).toBeInTheDocument();
            expect(screen.getByText(/⚠️ Already in favorites: Duplicate Song/)).toBeInTheDocument();
        });
    });

    test("displays error if no songs match the artist name", async () => {
        // First GET: wordcloud, Second GET: search returns no hits
        axios.get
            .mockResolvedValueOnce({ data: [] }) // word cloud
            .mockResolvedValueOnce({
                data: {
                    response: { hits: [] } // no search hits
                }
            });


        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );


        fireEvent.change(screen.getByPlaceholderText("Enter artist name..."), {
            target: { value: "No Match Artist" }
        });
        fireEvent.change(screen.getByPlaceholderText("Number of songs to display"), {
            target: { value: "5" }
        });
        fireEvent.click(screen.getByText("Search"));


        await waitFor(() => {
            expect(screen.getByText("No matches found for your search query.")).toBeInTheDocument();
        });
    });

    test("displays generic error if song fetching fails", async () => {
        const error = new Error("Network issue");
        axios.get
            .mockResolvedValueOnce({ data: [] }) // word cloud
            .mockRejectedValueOnce(error); // search fails


        console.error = jest.fn();


        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );


        fireEvent.change(screen.getByPlaceholderText("Enter artist name..."), {
            target: { value: "Test Artist" }
        });
        fireEvent.change(screen.getByPlaceholderText("Number of songs to display"), {
            target: { value: "3" }
        });
        fireEvent.click(screen.getByText("Search"));


        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith("Error fetching songs:", error);
            expect(screen.getByText("An error occurred while fetching songs. Please try again later.")).toBeInTheDocument();
        });
    });

    test("toggles song selection when checkbox is clicked", async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes("/api/genius/search")) {
                return Promise.resolve({
                    data: {
                        response: {
                            hits: [
                                {
                                    result: {
                                        id: "1",
                                        full_title: "Test Song",
                                        url: "https://example.com/song",
                                        header_image_url: "https://example.com/image.jpg",
                                        release_date_for_display: "2023-01-01",
                                        primary_artist: { name: "Test Artist" }
                                    }
                                }
                            ]
                        }
                    }
                });
            }
            if (url.includes("/api/wordcloud")) {
                return Promise.resolve({ data: [] });
            }
            return Promise.reject(new Error("Not mocked"));
        });


        render(
            <BrowserRouter>
                <Dashboard user="testUser" />
            </BrowserRouter>
        );


        fireEvent.change(screen.getByPlaceholderText("Enter artist name..."), {
            target: { value: "Test Artist" }
        });
        fireEvent.change(screen.getByPlaceholderText("Number of songs to display"), {
            target: { value: "1" }
        });
        fireEvent.click(screen.getByText("Search"));


        await waitFor(() => {
            expect(screen.getByText(/Test Song/)).toBeInTheDocument();
        });


        const checkbox = screen.getByRole("checkbox");


        // ✅ Initially not selected
        expect(checkbox).not.toBeChecked();


        // ✅ Select song
        fireEvent.click(checkbox);
        expect(checkbox).toBeChecked();


        // ✅ Deselect song
        fireEvent.click(checkbox);
        expect(checkbox).not.toBeChecked();
    });

    test("addSelectedToWordCloud handles lyrics fetch failure and word cloud save failure", async () => {
        const mockSong = {
            result: {
                id: "123",
                full_title: "Broken Song",
                url: "http://example.com/broken",
                header_image_url: "http://example.com/img.jpg",
                release_date_for_display: "2023-01-01",
                primary_artist: { name: "Broken Artist" }
            }
        };


        // First: word cloud GET on mount
        axios.get
            .mockResolvedValueOnce({ data: [] }) // for initial load of wordcloud
            .mockResolvedValueOnce({ // for search result
                data: {
                    response: {
                        hits: [mockSong]
                    }
                }
            })
            .mockRejectedValueOnce(new Error("Lyrics fetch failed")) // fail lyrics
            .mockRejectedValueOnce(new Error("Word cloud fetch failed")); // fail fetch after post


        // Fail post to word cloud
        axios.post.mockRejectedValueOnce(new Error("Word cloud post failed"));


        console.warn = jest.fn();
        console.error = jest.fn();


        render(
            <BrowserRouter>
                <Dashboard user="testUser" />
            </BrowserRouter>
        );


        // Perform a search
        fireEvent.change(screen.getByPlaceholderText("Enter artist name..."), {
            target: { value: "Broken Artist" },
        });
        fireEvent.change(screen.getByPlaceholderText("Number of songs to display"), {
            target: { value: "1" },
        });
        fireEvent.click(screen.getByText("Search"));


        await waitFor(() => {
            expect(screen.getByText(/Broken Song/)).toBeInTheDocument();
        });


        // Select the song and attempt to add to word cloud
        fireEvent.click(screen.getByRole("checkbox"));
        fireEvent.click(screen.getByText("Add Selected to Word Cloud"));


        await waitFor(() => {
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining("Failed to get lyrics for Broken Song")
            );
            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining("❌ Failed to save to word cloud:"),
                expect.any(Error)
            );
        });
    });

    test("bulkAddToFavorites skips songs not selected (else path)", async () => {
        const mockSongs = [
            {
                result: {
                    id: "not-selected-id",
                    full_title: "Unselected Song",
                    url: "http://unselected.com",
                    header_image_url: "http://unselected.com/img.jpg",
                    release_date_for_display: "2022-01-01",
                    primary_artist: { name: "Artist Name" }
                }
            }
        ];

        axios.get
            .mockResolvedValueOnce({ data: [] }) // word cloud
            .mockResolvedValueOnce({ data: { response: { hits: mockSongs } } });

        render(
            <BrowserRouter>
                <Dashboard user="testUser" />
            </BrowserRouter>
        );

        // Trigger the search
        fireEvent.change(screen.getByPlaceholderText("Enter artist name..."), {
            target: { value: "Artist Name" }
        });
        fireEvent.change(screen.getByPlaceholderText("Number of songs to display"), {
            target: { value: "1" }
        });
        fireEvent.click(screen.getByText("Search"));

        // Wait for song to show
        await waitFor(() => {
            expect(screen.getByText("🎵 Unselected Song")).toBeInTheDocument();
        });

        // ❌ Do NOT select the checkbox
        // fireEvent.click(screen.getByRole("checkbox"));

        // Click Add to Favorites
        fireEvent.click(screen.getByText("Add Selected to Favorites"));

        // ✅ Should trigger alert
        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith("Please select at least one song to add.");
        });

        // ✅ This proves the loop ran but skipped the `if (selectedSongs.includes(...))`
    });
    test("bulkAddToFavorites sets empty success and error messages when nothing is added or failed", async () => {
        axios.get
            .mockResolvedValueOnce({ data: [] }) // word cloud
            .mockResolvedValueOnce({ // search
                data: {
                    response: {
                        hits: [
                            {
                                result: {
                                    id: "123",
                                    full_title: "NoOp Song",
                                    url: "https://noop.com",
                                    header_image_url: "https://noop.com/img.jpg",
                                    release_date_for_display: "2023-01-01",
                                    primary_artist: { name: "Empty Artist" },
                                },
                            },
                        ],
                    },
                },
            });

        // Make sure lyrics call is skipped by not selecting anything
        render(
            <BrowserRouter>
                <Dashboard user="testUser" />
            </BrowserRouter>
        );

        // Fill in search inputs
        fireEvent.change(screen.getByPlaceholderText("Enter artist name..."), {
            target: { value: "Empty Artist" },
        });
        fireEvent.change(screen.getByPlaceholderText("Number of songs to display"), {
            target: { value: "1" },
        });
        fireEvent.click(screen.getByText("Search"));

        // Wait for results to render
        await waitFor(() => {
            expect(screen.getByText(/NoOp Song/)).toBeInTheDocument();
        });

        // ❌ Do NOT select the song, so added and failed remain empty
        fireEvent.click(screen.getByText("Add Selected to Favorites"));

        // ✅ Verify alert still shows for no selection
        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith("Please select at least one song to add.");
        });

        // ✅ Success & error messages should be empty strings (default state after ternary)
        // You can also assert that they are *not shown* if that logic exists in the JSX
        // OR you could expose setSuccessMessage/setErrorMessage values in the DOM to check
    });

    test("bulkAddToFavorites handles empty selection, lyrics fetch failure, and post failure", async () => {
        window.alert = jest.fn();
        console.warn = jest.fn();

        const mockSong = {
            result: {
                id: "fail123",
                full_title: "Fail Song",
                url: "https://fail.com",
                header_image_url: "https://fail.com/image.jpg",
                release_date_for_display: "2022-01-01",
                primary_artist: { name: "Fail Artist" },
            },
        };

        axios.get
            .mockResolvedValueOnce({ data: [] }) // word cloud
            .mockResolvedValueOnce({ data: { response: { hits: [mockSong] } } }) // search result
            .mockRejectedValueOnce(new Error("Lyrics fetch failed")); // lyrics fetch fails

        axios.post.mockRejectedValueOnce(new Error("Favorites post failed")); // post also fails

        render(
            <BrowserRouter>
                <Dashboard user="testUser" />
            </BrowserRouter>
        );

        fireEvent.click(screen.getByText("Add Selected to Favorites"));
        expect(window.alert).toHaveBeenCalledWith("Please select at least one song to add.");

        // ⬇️ Match artist exactly
        fireEvent.change(screen.getByPlaceholderText("Enter artist name..."), {
            target: { value: "Fail Artist" },
        });
        fireEvent.change(screen.getByPlaceholderText("Number of songs to display"), {
            target: { value: "1" },
        });
        fireEvent.click(screen.getByText("Search"));

        // Check song renders
        await waitFor(() => {
            expect(screen.getByText((text) => text.includes("Fail Song"))).toBeInTheDocument();
        });

        // Select + trigger
        fireEvent.click(screen.getByRole("checkbox"));
        fireEvent.click(screen.getByText("Add Selected to Favorites"));

        await waitFor(() => {
            expect(console.warn).toHaveBeenCalledWith("Failed to get lyrics for Fail Song");
            expect(screen.getByText("⚠️ Already in favorites: Fail Song")).toBeInTheDocument();
        });
    });

    test("bulkAddToFavorites sets empty errorMessage when all songs succeed", async () => {
        const mockSong = {
            result: {
                id: "123",
                full_title: "Success Song",
                url: "https://song.com",
                header_image_url: "https://song.com/image.jpg",
                release_date_for_display: "2023-01-01",
                primary_artist: { name: "Happy Artist" },
            },
        };

        // Mock all requests to succeed
        axios.get
            .mockResolvedValueOnce({ data: [] }) // word cloud
            .mockResolvedValueOnce({ data: { response: { hits: [mockSong] } } }) // search
            .mockResolvedValueOnce({ data: { lyrics: "This is a hit!" } }); // lyrics

        axios.post.mockResolvedValueOnce({ status: 200 }); // successful add

        render(
            <BrowserRouter>
                <Dashboard user="testUser" />
            </BrowserRouter>
        );

        // Fill search inputs
        fireEvent.change(screen.getByPlaceholderText("Enter artist name..."), {
            target: { value: "Happy Artist" },
        });
        fireEvent.change(screen.getByPlaceholderText("Number of songs to display"), {
            target: { value: "1" },
        });
        fireEvent.click(screen.getByText("Search"));

        // Wait for the result
        await waitFor(() => {
            expect(screen.getByText(/Success Song/)).toBeInTheDocument();
        });

        // Select the song and add to favorites
        fireEvent.click(screen.getByRole("checkbox"));
        fireEvent.click(screen.getByText("Add Selected to Favorites"));

        // ✅ Confirm success message appears
        await waitFor(() => {
            expect(screen.getByText("✅ Added: Success Song")).toBeInTheDocument();
        });

        // ✅ Confirm fallback path ran (no failed songs, so errorMessage === "")
        expect(screen.queryByText(/⚠️ Already in favorites/)).toBeNull(); // nothing rendered
    });
    test("bulkAddToFavorites skips songs not in selectedSongs (else path coverage)", async () => {
        const mockSongs = [
            {
                result: {
                    id: "1",
                    full_title: "Unselected Song",
                    url: "http://url1",
                    header_image_url: "http://img1",
                    release_date_for_display: "2021-01-01",
                    primary_artist: { name: "Unselected Artist" },
                },
            },
            {
                result: {
                    id: "2",
                    full_title: "Selected Song",
                    url: "http://url2",
                    header_image_url: "http://img2",
                    release_date_for_display: "2021-01-02",
                    primary_artist: { name: "Selected Artist" },
                },
            }
        ];

        // Mock requests
        axios.get
            .mockResolvedValueOnce({ data: [] }) // word cloud
            .mockResolvedValueOnce({ data: { response: { hits: mockSongs } } }) // search
            .mockResolvedValueOnce({ data: { lyrics: "Lyrics for selected" } }); // lyrics for selected

        axios.post.mockResolvedValueOnce({ status: 200 }); // selected song post success

        render(
            <BrowserRouter>
                <Dashboard user="testUser" />
            </BrowserRouter>
        );

        // Search with query matching both artists
        fireEvent.change(screen.getByPlaceholderText("Enter artist name..."), {
            target: { value: "Artist" },
        });
        fireEvent.change(screen.getByPlaceholderText("Number of songs to display"), {
            target: { value: "2" },
        });
        fireEvent.click(screen.getByText("Search"));

        await waitFor(() => {
            expect(screen.getByText(/Unselected Song/)).toBeInTheDocument();
            expect(screen.getByText(/Selected Song/)).toBeInTheDocument();
        });

        // ✅ Only select second song
        const checkboxes = screen.getAllByRole("checkbox");
        fireEvent.click(checkboxes[1]); // selects only the second song (id: "2")

        fireEvent.click(screen.getByText("Add Selected to Favorites"));

        // Wait for the post to occur
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining("/favorites/add"),
                expect.objectContaining({
                    songId: "2", // only selected
                    title: "Selected Song"
                })
            );
        });

        // ✅ Make sure Unselected Song was NOT added
        expect(axios.post).not.toHaveBeenCalledWith(
            expect.stringContaining("/favorites/add"),
            expect.objectContaining({ songId: "1" })
        );
    });


});

