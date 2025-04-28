import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import axios from 'axios';
import Dashboard from './Dashboard';
import { BrowserRouter } from "react-router-dom";

jest.mock('axios');
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => jest.fn(),
    Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />
}));

jest.mock('./WordCloudPanel', () => () => <div data-testid="word-cloud-panel" />);

const mockUser = "testUser";


describe('Dashboard', () => {
    const user = 'testUser';

    beforeEach(() => {
        jest.clearAllMocks();
        window.alert = jest.fn();
        Storage.prototype.removeItem = jest.fn();
        delete window.location;
        window.location = { reload: jest.fn() };
    });


    test('redirects if no user is provided', () => {
        render(<Dashboard user={null} />);
        expect(screen.getByTestId('navigate')).toBeInTheDocument();
    });

    test('renders dashboard with welcome message and inputs', () => {
        render(<Dashboard user={user} />);
        expect(screen.getByText(`Welcome, ${user}!`)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/enter artist name/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText('#')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    });

    test('fetches and displays songs from Genius API', async () => {
        const mockHits = [
            {
                result: {
                    id: '123',
                    full_title: 'Test Song by Artist',
                    header_image_url: 'http://img.com/123.jpg',
                    release_date_for_display: 'Jan 1, 2020',
                    primary_artist: { name: 'Artist' },
                    url: 'http://genius.com/song'
                }
            }
        ];

        axios.get.mockResolvedValueOnce({
            data: {
                response: {
                    hits: mockHits
                }
            }
        });

        render(<Dashboard user={user} />);

        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), {
            target: { value: 'Artist' }
        });
        fireEvent.change(screen.getByPlaceholderText('#'), {
            target: { value: '1' }
        });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));

        await waitFor(() => {
            expect(screen.getByText(/🎵 Test Song by Artist/)).toBeInTheDocument();
            expect(screen.getByText(/📅 Jan 1, 2020/)).toBeInTheDocument();
        });
    });

    test('handles invalid input on search', async () => {
        render(<Dashboard user={user} />);

        window.alert = jest.fn();

        fireEvent.click(screen.getByRole('button', { name: /search/i }));
        expect(window.alert).toHaveBeenCalledWith('Please enter an artist name!');

        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), {
            target: { value: 'Artist' }
        });
        fireEvent.change(screen.getByPlaceholderText('#'), {
            target: { value: '0' }
        });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));
        expect(window.alert).toHaveBeenCalledWith('Please enter a valid number of songs to display.');
    });

    test('selects and deselects songs', async () => {
        const song = {
            result: {
                id: '123',
                full_title: 'Test Song by Artist',
                header_image_url: 'http://img.com/123.jpg',
                release_date_for_display: 'Jan 1, 2020',
                primary_artist: { name: 'Artist' },
                url: 'http://genius.com/song'
            }
        };

        axios.get.mockResolvedValueOnce({
            data: {
                response: { hits: [song] }
            }
        });

        render(<Dashboard user={user} />);
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), {
            target: { value: 'Artist' }
        });
        fireEvent.change(screen.getByPlaceholderText('#'), {
            target: { value: '1' }
        });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));

        await waitFor(() => {
            expect(screen.getByText(/🎵 Test Song by Artist/)).toBeInTheDocument();
        });

        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);
        expect(checkbox.checked).toBe(true);
        fireEvent.click(checkbox);
        expect(checkbox.checked).toBe(false);
    });

    test('adds selected songs to favorites', async () => {
        const song = {
            result: {
                id: '123',
                full_title: 'Test Song',
                header_image_url: 'http://img.com/123.jpg',
                release_date_for_display: 'Jan 1, 2020',
                primary_artist: { name: 'Artist' },
                url: 'http://genius.com/song'
            }
        };

        axios.get
            .mockResolvedValueOnce({ data: { response: { hits: [song] } } }) // search
            .mockResolvedValueOnce({ data: { lyrics: 'test lyrics' } }); // lyrics
        axios.post.mockResolvedValue({ status: 200 });

        render(<Dashboard user={user} />);
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), {
            target: { value: 'Artist' }
        });
        fireEvent.change(screen.getByPlaceholderText('#'), {
            target: { value: '1' }
        });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));

        await waitFor(() => {
            expect(screen.getByText(/🎵 Test Song/)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /add selected to favorites/i }));

        await waitFor(() => {
            expect(screen.getByText(/✅ Added: Test Song/)).toBeInTheDocument();
        });
    });

    test('adds selected songs to word cloud', async () => {
        const song = {
            result: {
                id: '123',
                full_title: 'Test Song',
                header_image_url: 'http://img.com/123.jpg',
                release_date_for_display: 'Jan 1, 2020',
                primary_artist: { name: 'Artist' },
                url: 'http://genius.com/song'
            }
        };

        axios.get
            .mockResolvedValueOnce({ data: { response: { hits: [song] } } }) // search
            .mockResolvedValueOnce({ data: { lyrics: 'test lyrics' } }); // lyrics

        render(<Dashboard user={user} />);
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), {
            target: { value: 'Artist' }
        });
        fireEvent.change(screen.getByPlaceholderText('#'), {
            target: { value: '1' }
        });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));

        await waitFor(() => {
            expect(screen.getByText(/🎵 Test Song/)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /add selected to word cloud/i }));

        await waitFor(() => {
            expect(screen.getByTestId('word-cloud-panel')).toBeInTheDocument();
        });
    });

    test('adds all favorites to word cloud', async () => {
        const favorites = [
            {
                songId: '1',
                title: 'Fav Song',
                artistName: 'Artist',
                releaseDate: '2023',
                imageUrl: 'http://img.com/img.jpg',
                url: 'http://genius.com/fav-song'
            }
        ];

        axios.get
            .mockResolvedValueOnce({ data: favorites }) // /api/favorites/user
            .mockResolvedValueOnce({ data: { lyrics: 'fav lyrics' } }); // lyrics

        render(<Dashboard user={user} />);

        fireEvent.click(screen.getByRole('button', { name: /add all favorites to word cloud/i }));

        await waitFor(() => {
            expect(screen.getByTestId('word-cloud-panel')).toBeInTheDocument();
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
    test("handles empty search results (hits.length === 0)", async () => {
        axios.get.mockResolvedValueOnce({
            data: {
                response: {
                    hits: [] // This will trigger: if (hits.length === 0) break;
                }
            }
        });

        render(<Dashboard user={user} />);
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), {
            target: { value: 'Unknown Artist' }
        });
        fireEvent.change(screen.getByPlaceholderText('#'), {
            target: { value: '5' }
        });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));

        await waitFor(() => {
            expect(screen.getByText("No matches found for your search query.")).toBeInTheDocument();
        });
    });


    test("displays error when song fetching fails", async () => {
        const mockError = new Error("Network failure");
        axios.get
            .mockRejectedValueOnce(mockError); // simulate axios throwing

        console.error = jest.fn(); // mock console.error to suppress actual error log

        render(<Dashboard user="testUser" />);
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), {
            target: { value: "Adele" }
        });
        fireEvent.change(screen.getByPlaceholderText("#"), {
            target: { value: "1" }
        });

        fireEvent.click(screen.getByRole("button", { name: /^search$/i }));

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith("Error fetching songs:", mockError);
            expect(screen.getByText("An error occurred while fetching songs. Please try again later.")).toBeInTheDocument();
        });

        console.error.mockRestore(); // clean up
    });
    test("shows alert if no songs are selected when adding to favorites", async () => {
        axios.get.mockResolvedValueOnce({ data: [] }); // word cloud call on mount

        render(<Dashboard user="testUser" />);

        fireEvent.click(screen.getByRole("button", { name: /add selected to favorites/i }));

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith("Please select at least one song to add.");
        });

        // Optional: ensure no axios.post was called
        expect(axios.post).not.toHaveBeenCalled();
    });
    test("logs warning if lyrics fetch fails during add to favorites", async () => {
        const song = {
            result: {
                id: "123",
                full_title: "Broken Song",
                url: "http://example.com/broken",
                header_image_url: "http://example.com/img.jpg",
                release_date_for_display: "2023-01-01",
                primary_artist: { name: "Broken Artist" },
            }
        };

        // Search result
        axios.get
            .mockResolvedValueOnce({ data: { response: { hits: [song] } } }) // search
            .mockRejectedValueOnce(new Error("Lyrics fetch failed")); // lyrics fails

        // POST still succeeds
        axios.post.mockResolvedValueOnce({ status: 200 });

        const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => { /* no-op */ });

        render(<Dashboard user="testUser" />);

        // Trigger search
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), {
            target: { value: "Broken Artist" },
        });
        fireEvent.change(screen.getByPlaceholderText("#"), {
            target: { value: "1" },
        });
        fireEvent.click(screen.getByRole("button", { name: /search/i }));

        // Wait for song to render
        await waitFor(() => {
            expect(screen.getByText(/🎵 Broken Song/)).toBeInTheDocument();
        });

        // Select song and trigger add to favorites
        fireEvent.click(screen.getByRole("checkbox"));
        fireEvent.click(screen.getByRole("button", { name: /add selected to favorites/i }));

        // Check for warning log
        await waitFor(() => {
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining("Failed to get lyrics for Broken Song")
            );
        });

        consoleWarnSpy.mockRestore();
    });
    test("adds to failed list if POST to favorites returns non-200", async () => {
        const song = {
            result: {
                id: "123",
                full_title: "Rejected Song",
                url: "https://fail.com",
                header_image_url: "https://fail.com/image.jpg",
                release_date_for_display: "2024-01-01",
                primary_artist: { name: "Fail Artist" },
            }
        };

        axios.get
            .mockResolvedValueOnce({ data: { response: { hits: [song] } } }) // search
            .mockResolvedValueOnce({ data: { lyrics: "some lyrics" } }); // lyrics

        axios.post.mockResolvedValueOnce({ status: 400 }); // simulate failure response

        render(<Dashboard user="testUser" />);
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), {
            target: { value: "Fail Artist" },
        });
        fireEvent.change(screen.getByPlaceholderText("#"), {
            target: { value: "1" },
        });
        fireEvent.click(screen.getByRole("button", { name: /search/i }));

        await waitFor(() => {
            expect(screen.getByText(/🎵 Rejected Song/)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole("checkbox"));
        fireEvent.click(screen.getByRole("button", { name: /add selected to favorites/i }));

        await waitFor(() => {
            expect(screen.getByText(/⚠️ Already in favorites: Rejected Song/)).toBeInTheDocument();
        });
    });
    test("adds to failed list if POST to favorites throws error", async () => {
        const song = {
            result: {
                id: "456",
                full_title: "Post Error Song",
                url: "https://error.com",
                header_image_url: "https://error.com/image.jpg",
                release_date_for_display: "2024-02-01",
                primary_artist: { name: "Error Artist" },
            }
        };

        axios.get
            .mockResolvedValueOnce({ data: { response: { hits: [song] } } }) // search
            .mockResolvedValueOnce({ data: { lyrics: "lyrics again" } }); // lyrics

        axios.post.mockRejectedValueOnce(new Error("POST failed")); // simulate network/server error

        render(<Dashboard user="testUser" />);
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), {
            target: { value: "Error Artist" },
        });
        fireEvent.change(screen.getByPlaceholderText("#"), {
            target: { value: "1" },
        });
        fireEvent.click(screen.getByRole("button", { name: /search/i }));

        await waitFor(() => {
            expect(screen.getByText(/🎵 Post Error Song/)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole("checkbox"));
        fireEvent.click(screen.getByRole("button", { name: /add selected to favorites/i }));

        await waitFor(() => {
            expect(screen.getByText(/⚠️ Already in favorites: Post Error Song/)).toBeInTheDocument();
        });
    });
    test('shows error message if no favorites are found when adding to word cloud', async () => {
        axios.get
            .mockResolvedValueOnce({ data: [] }); // simulate empty favorites list

        render(<Dashboard user="testUser" />);

        fireEvent.click(screen.getByRole('button', { name: /add all favorites to word cloud/i }));

        await waitFor(() => {
            expect(screen.getByText("No favorites found.")).toBeInTheDocument();
        });
    });
    test('handles failure when fetching lyrics (console.warn)', async () => {
        const favorites = [
            {
                songId: "fail-id",
                title: "Fail Song",
                artistName: "Artist",
                releaseDate: "2023",
                imageUrl: "http://img.com/img.jpg",
                url: "http://genius.com/fail-song"
            }
        ];

        // First call: get favorites
        axios.get
            .mockResolvedValueOnce({ data: favorites }) // /api/favorites/user
            .mockRejectedValueOnce(new Error("Lyrics fetch failed")); // /api/genius/lyrics

        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {/* no-op */});

        render(<Dashboard user="testUser" />);
        fireEvent.click(screen.getByRole('button', { name: /add all favorites to word cloud/i }));

        await waitFor(() => {
            expect(warnSpy).toHaveBeenCalledWith("Failed to get lyrics for Fail Song");
        });

        warnSpy.mockRestore();
    });
    test('handles lyrics fetch failure when adding selected to word cloud', async () => {
        const song = {
            result: {
                id: 'fail-id',
                full_title: 'Fail Song',
                header_image_url: 'http://img.com/fail.jpg',
                release_date_for_display: '2024',
                primary_artist: { name: 'Fail Artist' },
                url: 'http://genius.com/fail-song'
            }
        };

        // Search returns the song
        axios.get
            .mockResolvedValueOnce({ data: { response: { hits: [song] } } }) // search result
            .mockRejectedValueOnce(new Error("Lyrics API failure"));         // lyrics fetch fails

        const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {/* no-op */});

        render(<Dashboard user="testUser" />);

        // Fill inputs
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), {
            target: { value: 'Fail Artist' }
        });
        fireEvent.change(screen.getByPlaceholderText('#'), {
            target: { value: '1' }
        });

        // Click search
        fireEvent.click(screen.getByRole('button', { name: /search/i }));

        // Wait for result
        await waitFor(() => {
            expect(screen.getByText(/🎵 Fail Song/)).toBeInTheDocument();
        });

        // Select song + Add to Word Cloud
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /add selected to word cloud/i }));

        await waitFor(() => {
            expect(warnSpy).toHaveBeenCalledWith("Failed to get lyrics for Fail Song");
        });

        warnSpy.mockRestore();
    });
    test("skips unselected songs in bulkAddToFavorites", async () => {
        const song = {
            result: {
                id: "456",
                full_title: "Unselected Song",
                url: "http://genius.com/unselected",
                header_image_url: "http://img.com/unselected.jpg",
                release_date_for_display: "2025",
                primary_artist: { name: "Some Artist" }
            }
        };

        axios.get.mockResolvedValueOnce({ data: { response: { hits: [song] } } });

        render(<Dashboard user="testUser" />);

        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), {
            target: { value: "Some Artist" }
        });
        fireEvent.change(screen.getByPlaceholderText("#"), {
            target: { value: "1" }
        });
        fireEvent.click(screen.getByRole("button", { name: /search/i }));

        await waitFor(() => {
            expect(screen.getByText(/🎵 Unselected Song/)).toBeInTheDocument();
        });

        // Do not check the checkbox to simulate unselected song
        fireEvent.click(screen.getByRole("button", { name: /add selected to favorites/i }));

        await waitFor(() => {
            // There should be no success or failure message
            expect(screen.queryByText(/✅/)).not.toBeInTheDocument();
            expect(screen.queryByText(/❌/)).not.toBeInTheDocument();
        });
    });

    test("logs info for unselected songs when only one of multiple search results is selected", async () => {
        // Define two songs in the search results.
        const song1 = {
            result: {
                id: "1",
                full_title: "Selected Song",
                header_image_url: "http://img.com/selected.jpg",
                release_date_for_display: "2025",
                primary_artist: { name: "Test Artist" },
                url: "http://genius.com/selected-song"
            }
        };
        const song2 = {
            result: {
                id: "2",
                full_title: "Unselected Song",
                header_image_url: "http://img.com/unselected.jpg",
                release_date_for_display: "2025",
                primary_artist: { name: "Test Artist" },
                url: "http://genius.com/unselected-song"
            }
        };

        // When searching, return both songs.
        axios.get.mockResolvedValueOnce({
            data: {
                response: {
                    hits: [song1, song2],
                },
            },
        });
        // Mock lyrics fetch for the selected song (song1)
        axios.get.mockResolvedValueOnce({ data: { lyrics: "lyrics for selected song" } });
        // And assume the POST for the selected song succeeds.
        axios.post.mockResolvedValueOnce({ status: 200 });

        // Spy on console.info
        const consoleSpy = jest.spyOn(console, "info").mockImplementation(() => {/* no-op */});

        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );

        // Fill in search inputs.
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), {
            target: { value: "Test Artist" },
        });
        fireEvent.change(screen.getByPlaceholderText("#"), {
            target: { value: "2" },
        });

        // Trigger the search.
        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: /^search$/i }));
        });

        // Wait for both songs to render.
        await waitFor(() => {
            expect(screen.getByText(/Selected Song/)).toBeInTheDocument();
            expect(screen.getByText(/Unselected Song/)).toBeInTheDocument();
        });

        // Simulate selecting only song1.
        const checkboxes = screen.getAllByRole("checkbox");
        // Assume the order of checkboxes corresponds to the order of songs in the result.
        fireEvent.click(checkboxes[0]); // Select song1.
        // Do not click the second checkbox, so song2 remains unselected.

        // Trigger the bulk add action.
        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: /add selected to favorites/i }));
        });

        // Verify that the "else" branch was executed: console.info should have been called for song2.
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith("Skipping song not in selected list: Unselected Song");
        });

        consoleSpy.mockRestore();
    });
});
