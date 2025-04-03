import React from 'react';
import {render, screen, fireEvent, waitFor, act} from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import Dashboard from './Dashboard';
import Favorites from "./Favorites";

const mockUser = 'testUser';

// Mock dependencies
jest.mock('axios');
jest.mock('./WordCloudPanel', () => {
    return function MockWordCloudPanel({ wordCloudSongs, user, loading }) {
        return (
            <div data-testid="word-cloud-panel">
                <div data-testid="cloud-songs">{JSON.stringify(wordCloudSongs)}</div>
                <div data-testid="cloud-user">{user}</div>
                <div data-testid="cloud-loading">{loading.toString()}</div>
            </div>
        );
    };
});

// Mock useNavigate
jest.mock('react-router-dom', () => {
    const actual = jest.requireActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => jest.fn(),
        Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />
    };
});

describe('Dashboard Component', () => {
    const mockUser = 'testUser';
    const mockSongs = {
        response: {
            hits: [
                {
                    result: {
                        id: '123',
                        full_title: 'Test Song',
                        url: 'https://test.com/song',
                        header_image_url: 'https://test.com/image.jpg',
                        release_date: '2023-01-01',
                        primary_artist: { name: 'Test Artist' }
                    }
                },
                {
                    result: {
                        id: '456',
                        full_title: 'Another Song',
                        url: 'https://test.com/another',
                        header_image_url: 'https://test.com/another.jpg',
                        release_date_for_display: 'January 2023',
                        primary_artist: { name: 'Another Artist' }
                    }
                }
            ]
        }
    };

    beforeEach(() => {
        Storage.prototype.removeItem = jest.fn();

        // Mock window.location.reload
        delete window.location;
        window.location = { reload: jest.fn() };
        // Mock the lyrics response
        axios.get.mockImplementation((url) => {
            if (url === 'http://localhost:8080/api/wordcloud/testUser') {
                return Promise.resolve({ data: [] });
            } else if (url === 'http://localhost:8080/api/genius/search') {
                return Promise.resolve({ data: mockSongs });
            } else if (url === 'http://localhost:8080/api/genius/lyrics') {
                return Promise.resolve({ data: { lyrics: 'Test lyrics for this song' } });
            }
            return Promise.reject(new Error('Not mocked'));
        });

        // Mock post responses
        axios.post.mockImplementation((url) => {
            if (url === 'http://localhost:8080/api/favorites/add') {
                return Promise.resolve({ status: 200 });
            } else if (url === 'http://localhost:8080/api/wordcloud/add') {
                return Promise.resolve({ status: 200 });
            }
            return Promise.reject(new Error('Not mocked'));
        });

        // Set up window event listeners
        window.addEventListener = jest.fn();
        window.removeEventListener = jest.fn();
        jest.clearAllMocks();

        // Ensure clearInterval and setInterval are defined in global scope
        global.clearInterval = clearInterval;
        global.setInterval = setInterval;

        // optional: mock localStorage + reload if needed
        Storage.prototype.removeItem = jest.fn();
        delete window.location;
        window.location = { reload: jest.fn() };
    });

    test('redirects to home if user is not provided', () => {
        render(
            <BrowserRouter>
                <Favorites user={null} />
            </BrowserRouter>
        );

        // Check that the Navigate component was rendered
        const nav = screen.getByTestId('navigate');
        expect(nav).toBeInTheDocument();
        expect(nav).toHaveAttribute('data-to', '/');
    });



    test('displays welcome message with username', () => {
        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );

        expect(screen.getByText(`Welcome, ${mockUser}!`)).toBeInTheDocument();
    });

    test('loads word cloud data on initial render', async () => {
        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(`http://localhost:8080/api/wordcloud/${mockUser}`);
        });
    });

    test('alerts when search is attempted without query', () => {
        window.alert = jest.fn();

        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );

        const searchButton = screen.getByText('Search');
        fireEvent.click(searchButton);

        expect(window.alert).toHaveBeenCalledWith('Please enter a song title!');
    });

    test('alerts when search is attempted without valid song limit', () => {
        window.alert = jest.fn();

        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );

        const queryInput = screen.getByPlaceholderText('Enter song title...');
        fireEvent.change(queryInput, { target: { value: 'test song' } });

        const searchButton = screen.getByText('Search');
        fireEvent.click(searchButton);

        expect(window.alert).toHaveBeenCalledWith('Please enter a valid number of songs to display.');
    });

    test('fetches songs when search is performed with valid inputs', async () => {
        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );

        const queryInput = screen.getByPlaceholderText('Enter song title...');
        fireEvent.change(queryInput, { target: { value: 'test song' } });

        const limitInput = screen.getByPlaceholderText('Number of songs to display');
        fireEvent.change(limitInput, { target: { value: '10' } });

        const searchButton = screen.getByText('Search');
        fireEvent.click(searchButton);

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('http://localhost:8080/api/genius/search', {
                params: { q: 'test song', page: 1 }
            });
        });

        await waitFor(() => {
            // Use getAllByText instead of getByText since multiple elements can have the same text
            expect(screen.getAllByText('🎵 Test Song').length).toBeGreaterThan(0);
            expect(screen.getAllByText('🎵 Another Song').length).toBeGreaterThan(0);
        });
    });

    test('toggles song selection when checkbox is clicked', async () => {
        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );

        // Search for songs first
        const queryInput = screen.getByPlaceholderText('Enter song title...');
        fireEvent.change(queryInput, { target: { value: 'test song' } });

        const limitInput = screen.getByPlaceholderText('Number of songs to display');
        fireEvent.change(limitInput, { target: { value: '10' } });

        const searchButton = screen.getByText('Search');
        fireEvent.click(searchButton);

        await waitFor(() => {
            expect(screen.getAllByText('🎵 Test Song').length).toBeGreaterThan(0);
        });

        // Now test checkbox toggle
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);

        fireEvent.click(checkboxes[0]);
        expect(checkboxes[0]).toBeChecked();

        fireEvent.click(checkboxes[0]);
        expect(checkboxes[0]).not.toBeChecked();
    });

    test('alerts when trying to add favorites without selection', async () => {
        window.alert = jest.fn();

        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );

        // Search for songs first
        const queryInput = screen.getByPlaceholderText('Enter song title...');
        fireEvent.change(queryInput, { target: { value: 'test song' } });

        const limitInput = screen.getByPlaceholderText('Number of songs to display');
        fireEvent.change(limitInput, { target: { value: '10' } });

        const searchButton = screen.getByText('Search');
        fireEvent.click(searchButton);

        await waitFor(() => {
            expect(screen.getAllByText('🎵 Test Song').length).toBeGreaterThan(0);
        });

        // Try to add to favorites without selection
        const addToFavoritesButton = screen.getByText('Add Selected to Favorites');
        fireEvent.click(addToFavoritesButton);

        expect(window.alert).toHaveBeenCalledWith('Please select at least one song to add.');
    });

    test('adds selected songs to favorites', async () => {
        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );

        // Search for songs
        const queryInput = screen.getByPlaceholderText('Enter song title...');
        fireEvent.change(queryInput, { target: { value: 'test song' } });

        const limitInput = screen.getByPlaceholderText('Number of songs to display');
        fireEvent.change(limitInput, { target: { value: '10' } });

        const searchButton = screen.getByText('Search');
        fireEvent.click(searchButton);

        await waitFor(() => {
            expect(screen.getAllByText('🎵 Test Song').length).toBeGreaterThan(0);
        });

        // Select a song
        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]);

        // Add to favorites
        const addToFavoritesButton = screen.getByText('Add Selected to Favorites');
        fireEvent.click(addToFavoritesButton);

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('http://localhost:8080/api/genius/lyrics', {
                params: { songId: '123' }
            });

            expect(axios.post).toHaveBeenCalledWith('http://localhost:8080/api/favorites/add', expect.objectContaining({
                username: mockUser,
                songId: '123',
                title: 'Test Song'
            }));
        });

        // Check for success message - use a regex to match partial content
        await waitFor(() => {
            const successMessages = screen.getAllByText(/✅ Added:/);
            expect(successMessages.length).toBeGreaterThan(0);
        });
    });

    test('adds selected songs to word cloud', async () => {
        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );

        // Search for songs
        const queryInput = screen.getByPlaceholderText('Enter song title...');
        fireEvent.change(queryInput, { target: { value: 'test song' } });

        const limitInput = screen.getByPlaceholderText('Number of songs to display');
        fireEvent.change(limitInput, { target: { value: '10' } });

        const searchButton = screen.getByText('Search');
        fireEvent.click(searchButton);

        await waitFor(() => {
            expect(screen.getAllByText('🎵 Test Song').length).toBeGreaterThan(0);
        });

        // Select a song
        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]);

        // Add to word cloud
        const addToWordCloudButton = screen.getByText('Add Selected to Word Cloud');
        fireEvent.click(addToWordCloudButton);

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('http://localhost:8080/api/genius/lyrics', {
                params: { songId: '123' }
            });

            expect(axios.post).toHaveBeenCalledWith('http://localhost:8080/api/wordcloud/add', expect.arrayContaining([
                expect.objectContaining({
                    username: mockUser,
                    songId: '123',
                    title: 'Test Song'
                })
            ]));
        });
    });




});

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
    const actual = jest.requireActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />
    };
});
describe('Dashboard Component - Inactivity Logout', () => {
    const mockUser = 'testUser';
    let nowSpy;
    let clearIntervalSpy;

    beforeEach(() => {
        jest.useFakeTimers();

        nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1000);
        clearIntervalSpy = jest.spyOn(global, 'clearInterval');

        Storage.prototype.removeItem = jest.fn();
        delete window.location;
        window.location = { reload: jest.fn() };

        axios.get.mockImplementation((url) => {
            if (url.includes(`/wordcloud/${mockUser}`)) {
                return Promise.resolve({ data: [] });
            }
            return Promise.reject(new Error('Not mocked'));
        });
    });

    afterEach(() => {
        nowSpy.mockRestore();
        clearIntervalSpy.mockRestore();
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    test('logs out when user is inactive for more than 60 seconds', async () => {
        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );

        // simulate user was active at 0, now it's 70,000ms
        nowSpy.mockReturnValue(70000);

        act(() => {
            jest.advanceTimersByTime(1100); // triggers interval
        });

        expect(localStorage.removeItem).toHaveBeenCalledWith('user');
        expect(window.location.reload).toHaveBeenCalled();
        expect(clearIntervalSpy).toHaveBeenCalled();
    });

    test('does not log out when user is active within 60 seconds', async () => {
        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );

        nowSpy.mockReturnValue(30000); // 30s later

        act(() => {
            jest.advanceTimersByTime(1100);
        });

        expect(localStorage.removeItem).not.toHaveBeenCalled();
        expect(window.location.reload).not.toHaveBeenCalled();
    });

    test('cleans up on unmount', () => {
        const removeSpy = jest.spyOn(window, 'removeEventListener');

        const { unmount } = render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );

        unmount();

        const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
        events.forEach((e) => {
            expect(removeSpy).toHaveBeenCalledWith(e, expect.any(Function));
        });

        expect(clearIntervalSpy).toHaveBeenCalled();
    });

    test('uses empty array if backend returns null for word cloud songs', async () => {
        axios.get.mockResolvedValueOnce({ data: null });

        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByTestId('cloud-songs')).toHaveTextContent('[]');
        });
    });
    test('logs error if word cloud fetch fails', async () => {
        const error = new Error('Network error');
        axios.get.mockRejectedValueOnce(error);
        console.error = jest.fn();

        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith('❌ Failed to load word cloud songs:', error);
        });
    });
    test('logs error when song fetching fails', async () => {
        const error = new Error('Network failure');
        console.error = jest.fn();

        // Explicitly mock the exact GET request fetchSongs makes
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/genius/search')) {
                return Promise.reject(error);
            }
            return Promise.resolve({ data: [] }); // default mock for other endpoints
        });

        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );

        const queryInput = screen.getByPlaceholderText('Enter song title...');
        fireEvent.change(queryInput, { target: { value: 'test song' } });

        const limitInput = screen.getByPlaceholderText('Number of songs to display');
        fireEvent.change(limitInput, { target: { value: '10' } });

        const searchButton = screen.getByText('Search');
        fireEvent.click(searchButton);

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith('Error fetching songs:', error);
        });
    });
    test('stops fetching when no more hits are returned (hits.length === 0)', async () => {
        const emptyHitsResponse = {
            data: {
                response: {
                    hits: [] // triggers the break statement
                }
            }
        };

        axios.get.mockImplementation((url) => {
            if (url.includes('/api/genius/search')) {
                return Promise.resolve(emptyHitsResponse);
            } else if (url.includes('/api/wordcloud')) {
                return Promise.resolve({ data: [] });
            }
            return Promise.reject(new Error('Not mocked'));
        });

        render(
            <BrowserRouter>
                <Dashboard user="testUser" />
            </BrowserRouter>
        );

        const queryInput = screen.getByPlaceholderText('Enter song title...');
        fireEvent.change(queryInput, { target: { value: 'test song' } });

        const limitInput = screen.getByPlaceholderText('Number of songs to display');
        fireEvent.change(limitInput, { target: { value: '10' } });

        const searchButton = screen.getByText('Search');
        fireEvent.click(searchButton);

        await waitFor(() => {
            // Since there are no hits, we expect "No songs found." message
            expect(screen.getByText('No songs found.')).toBeInTheDocument();
        });

        // Optionally, confirm axios.get was only called once due to break
        expect(axios.get).toHaveBeenCalledTimes(2); // 1 for word cloud, 1 for search
    });

    test('shows warning and sets lyrics to "Unknown" when lyrics API fails', async () => {
        console.warn = jest.fn(); // mock console.warn

        axios.get.mockImplementation((url) => {
            if (url.includes('/api/genius/lyrics')) {
                return Promise.reject(new Error('Lyrics fetch failed'));
            }
            return Promise.resolve({
                data: {
                    response: {
                        hits: [
                            {
                                result: {
                                    id: '123',
                                    full_title: 'Test Song',
                                    url: 'https://example.com/song',
                                    header_image_url: 'https://example.com/img.jpg',
                                    primary_artist: { name: 'Artist' },
                                }
                            }
                        ]
                    }
                }
            });
        });

        render(
            <BrowserRouter>
                <Dashboard user="testUser" />
            </BrowserRouter>
        );

        // Search for songs
        fireEvent.change(screen.getByPlaceholderText('Enter song title...'), { target: { value: 'test song' } });
        fireEvent.change(screen.getByPlaceholderText('Number of songs to display'), { target: { value: '1' } });
        fireEvent.click(screen.getByText('Search'));

        await waitFor(() => expect(screen.getByText('🎵 Test Song')).toBeInTheDocument());

        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]);

        fireEvent.click(screen.getByText('Add Selected to Favorites'));

        await waitFor(() => {
            expect(console.warn).toHaveBeenCalledWith('Failed to get lyrics for Test Song');
        });
    });

    test('uses fallback "Unknown" values for missing release date and artist name', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/search')) {
                return Promise.resolve({
                    data: {
                        response: {
                            hits: [
                                {
                                    result: {
                                        id: '123',
                                        full_title: 'Mystery Song',
                                        url: 'https://test.com/mystery',
                                        header_image_url: 'https://test.com/mystery.jpg',
                                        release_date: null,
                                        release_date_for_display: null,
                                        primary_artist: null // missing artist
                                    }
                                }
                            ]
                        }
                    }
                });
            } else if (url.includes('/lyrics')) {
                return Promise.resolve({ data: { lyrics: 'Test lyrics' } });
            } else if (url.includes('/wordcloud')) {
                return Promise.resolve({ data: [] });
            }
            return Promise.reject(new Error('Not mocked'));
        });

        axios.post.mockResolvedValue({ status: 200 });

        render(
            <BrowserRouter>
                <Dashboard user="testUser" />
            </BrowserRouter>
        );

        fireEvent.change(screen.getByPlaceholderText('Enter song title...'), { target: { value: 'mystery' } });
        fireEvent.change(screen.getByPlaceholderText('Number of songs to display'), { target: { value: '1' } });
        fireEvent.click(screen.getByText('Search'));

        await waitFor(() => {
            expect(screen.getByText('🎵 Mystery Song')).toBeInTheDocument();
        });

        fireEvent.click(screen.getAllByRole('checkbox')[0]);
        fireEvent.click(screen.getByText('Add Selected to Favorites'));

        await waitFor(() => {
            // No need to assert directly here since fallbacks are used internally,
            // but axios.post would’ve been called with "Unknown" as fallback values
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/favorites/add'),
                expect.objectContaining({
                    releaseDate: 'Unknown',
                    artistName: 'Unknown'
                })
            );
        });
    });
    test('handles lyrics fetch failure and uses "Unknown" fallbacks', async () => {
        window.alert = jest.fn();
        console.warn = jest.fn();

        axios.get.mockImplementation((url) => {
            if (url.includes('/api/genius/search')) {
                return Promise.resolve({
                    data: {
                        response: {
                            hits: [
                                {
                                    result: {
                                        id: 'abc123',
                                        full_title: 'Mystery Song',
                                        url: 'https://example.com/song',
                                        header_image_url: 'https://example.com/img.jpg',
                                        // Simulate missing release_date & artist
                                        primary_artist: {}
                                    }
                                }
                            ]
                        }
                    }
                });
            }

            if (url.includes('/api/genius/lyrics')) {
                return Promise.reject(new Error('Lyrics fetch failed'));
            }

            return Promise.reject(new Error('Not mocked'));
        });

        axios.post.mockResolvedValue({ status: 200 });

        render(
            <BrowserRouter>
                <Dashboard user="testUser" />
            </BrowserRouter>
        );

        fireEvent.change(screen.getByPlaceholderText('Enter song title...'), {
            target: { value: 'test song' }
        });

        fireEvent.change(screen.getByPlaceholderText('Number of songs to display'), {
            target: { value: '1' }
        });

        fireEvent.click(screen.getByText('Search'));

        await waitFor(() => {
            expect(screen.getByText('🎵 Mystery Song')).toBeInTheDocument();
        });

        // Select the song
        fireEvent.click(screen.getByRole('checkbox'));

        // Add to favorites (triggers lyrics fetch)
        fireEvent.click(screen.getByText('Add Selected to Favorites'));

        await waitFor(() => {
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('Failed to get lyrics for Mystery Song')
            );
        });

        await waitFor(() => {
            const dateText = screen.getByText('📅 Unknown');
            expect(dateText).toBeInTheDocument();
        });
    });
    test('handles word cloud save failure and logs error', async () => {
        window.alert = jest.fn();
        console.error = jest.fn();

        const mockSongs = {
            response: {
                hits: [
                    {
                        result: {
                            id: '123',
                            full_title: 'Test Song',
                            url: 'https://example.com/song',
                            header_image_url: 'https://example.com/img.jpg',
                            release_date: '2023-01-01',
                            primary_artist: { name: 'Test Artist' },
                        }
                    }
                ]
            }
        };

        axios.get.mockImplementation((url) => {
            if (url.includes('/api/genius/search')) {
                return Promise.resolve({ data: mockSongs });
            }
            if (url.includes('/api/genius/lyrics')) {
                return Promise.resolve({ data: { lyrics: 'Test lyrics' } });
            }
            if (url.includes('/api/wordcloud')) {
                return Promise.reject(new Error('Failed to load updated word cloud'));
            }
            return Promise.reject(new Error('Not mocked'));
        });

        axios.post.mockResolvedValueOnce({ status: 200 });

        render(
            <BrowserRouter>
                <Dashboard user="testUser" />
            </BrowserRouter>
        );

        fireEvent.change(screen.getByPlaceholderText('Enter song title...'), {
            target: { value: 'test song' }
        });
        fireEvent.change(screen.getByPlaceholderText('Number of songs to display'), {
            target: { value: '1' }
        });
        fireEvent.click(screen.getByText('Search'));

        await waitFor(() => {
            expect(screen.getByText('🎵 Test Song')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByText('Add Selected to Word Cloud'));

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith(
                '❌ Failed to save to word cloud:',
                expect.any(Error)
            );
        });

    });

    test('redirects to home if user is not provided', () => {
        render(
            <BrowserRouter>
                <Dashboard user={null} />
            </BrowserRouter>
        );

        const redirect = screen.getByTestId('navigate');
        expect(redirect).toBeInTheDocument();
        expect(redirect).toHaveAttribute('data-to', '/');
    });

    test('shows warning and sets lyrics to "Unknown" when lyrics API fails during word cloud addition', async () => {
        const mockSong = {
            result: {
                id: 'fail-lyrics',
                full_title: 'Test Song',
                url: 'https://example.com/song',
                header_image_url: 'https://example.com/img.jpg',
                release_date: '',
                primary_artist: {}
            }
        };

        const mockResponse = {
            response: {
                hits: [mockSong]
            }
        };

        // Mock lyrics API to throw
        axios.get.mockImplementation((url) => {
            if (url === 'http://localhost:8080/api/genius/search') {
                return Promise.resolve({ data: mockResponse });
            } else if (url.includes('api/genius/lyrics')) {
                return Promise.reject(new Error('Lyrics API failed'));
            } else if (url.includes('/api/wordcloud/testUser')) {
                return Promise.resolve({ data: [] });
            }
            return Promise.reject(new Error('Not mocked'));
        });

        // Spy on console.warn
        console.warn = jest.fn();

        render(
            <BrowserRouter>
                <Dashboard user="testUser" />
            </BrowserRouter>
        );

        // Search for songs
        fireEvent.change(screen.getByPlaceholderText('Enter song title...'), {
            target: { value: 'test song' }
        });

        fireEvent.change(screen.getByPlaceholderText('Number of songs to display'), {
            target: { value: '1' }
        });

        fireEvent.click(screen.getByText('Search'));

        // Wait for search results
        await waitFor(() => {
            expect(screen.getByText(/Test Song/)).toBeInTheDocument();
        });

        // Select the song
        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);

        // Add to word cloud
        fireEvent.click(screen.getByText('Add Selected to Word Cloud'));

        // Wait for console.warn to be called with the correct message
        await waitFor(() => {
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('Failed to get lyrics for Test Song')
            );
        });
    });
    test('adds selected song to favorites - covers else (non-200 status)', async () => {
        const song = {
            result: {
                id: '444',
                full_title: 'Rejected Song',
                url: 'https://example.com/song',
                header_image_url: 'https://example.com/img.jpg',
                release_date: '2021-01-01',
                primary_artist: { name: 'Unlucky Artist' }
            }
        };

        axios.get.mockImplementation((url) => {
            if (url.includes('/search')) {
                return Promise.resolve({
                    data: { response: { hits: [song] } }
                });
            }
            if (url.includes('/lyrics')) {
                return Promise.resolve({ data: { lyrics: 'No one likes this' } });
            }
            if (url.includes('/wordcloud')) {
                return Promise.resolve({ data: [] });
            }
            return Promise.reject(new Error('Unmocked GET'));
        });

        // ✅ Return a non-200 status to hit the else block
        axios.post.mockResolvedValueOnce({ status: 400 });

        render(
            <BrowserRouter>
                <Dashboard user="testUser" />
            </BrowserRouter>
        );

        // Search + select song
        fireEvent.change(screen.getByPlaceholderText('Enter song title...'), { target: { value: 'rejected' } });
        fireEvent.change(screen.getByPlaceholderText('Number of songs to display'), { target: { value: '1' } });
        fireEvent.click(screen.getByText('Search'));

        await waitFor(() => {
            expect(screen.getByText(/Rejected Song/)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByText('Add Selected to Favorites'));

        // ✅ Look for the warning message that includes failed song
        await waitFor(() => {
            expect(screen.getByText(/⚠️ Already in favorites: Rejected Song/)).toBeInTheDocument();
        });
    });



});
