// Favorites.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';
import Favorites from './Favorites';

// Mock axios
jest.mock('axios');

// Mock react-router-dom
jest.mock('react-router-dom', () => {
    const actual = jest.requireActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => jest.fn(),
        Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />
    };
});

// Mock WordCloudPanel component
jest.mock('./WordCloudPanel', () => {
    return function MockWordCloudPanel({ wordCloudSongs, user }) {
        return (
            <div data-testid="word-cloud-panel">
                <div data-testid="word-cloud-songs">{JSON.stringify(wordCloudSongs)}</div>
                <div data-testid="word-cloud-user">{user}</div>
            </div>
        );
    };
});

describe('Favorites Component', () => {
    const mockUser = 'testUser';
    const mockFavorites = [
        {
            songId: '1',
            title: 'Test Song 1',
            artistName: 'Test Artist 1',
            releaseDate: '2025-01-01',
            imageUrl: 'http://example.com/image1.jpg',
            rank: 1
        },
        {
            songId: '2',
            title: 'Test Song 2',
            artistName: 'Test Artist 2',
            releaseDate: '2025-02-01',
            imageUrl: 'http://example.com/image2.jpg',
            rank: 2
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock localStorage
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: jest.fn(),
                setItem: jest.fn(),
                removeItem: jest.fn()
            },
            writable: true
        });

        // Mock window.location.reload
        Object.defineProperty(window, 'location', {
            value: {
                reload: jest.fn()
            },
            writable: true
        });

        // Setup default axios response
        axios.get.mockResolvedValue({ data: mockFavorites });
        axios.post.mockResolvedValue({ data: { message: 'Success' } });
        axios.delete.mockResolvedValue({ data: { message: 'Deleted' } });
    });

    test('fetches and displays favorites when user is logged in', async () => {
        render(
            <BrowserRouter>
                <Favorites user={mockUser} />
            </BrowserRouter>
        );

        expect(axios.get).toHaveBeenCalledWith(`http://localhost:8080/api/favorites/${mockUser}`);

        await waitFor(() => {
            expect(screen.getByText("💖 testUser's Favorite Songs")).toBeInTheDocument();
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
            expect(screen.getByText('Test Song 2')).toBeInTheDocument();
        });
    });

    test('handles empty favorites array', async () => {
        axios.get.mockResolvedValueOnce({ data: [] });

        render(
            <BrowserRouter>
                <Favorites user={mockUser} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('No favorite songs yet.')).toBeInTheDocument();
        });
    });

    test('handles favorites fetch error', async () => {
        axios.get.mockRejectedValueOnce(new Error('Failed to fetch'));

        render(
            <BrowserRouter>
                <Favorites user={mockUser} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('No favorite songs yet.')).toBeInTheDocument();
        });
    });

    test('handles logging out on inactivity', async () => {
        jest.useFakeTimers();

        render(
            <BrowserRouter>
                <Favorites user={mockUser} />
            </BrowserRouter>
        );

        // Fast-forward time by more than 60 seconds
        await act(async () => {
            jest.advanceTimersByTime(61000);
        });

        expect(window.localStorage.removeItem).toHaveBeenCalledWith('user');
        expect(window.location.reload).toHaveBeenCalled();

        jest.useRealTimers();
    });

    test('resets inactivity timer on user interaction', async () => {
        jest.useFakeTimers();

        render(
            <BrowserRouter>
                <Favorites user={mockUser} />
            </BrowserRouter>
        );

        // Fast-forward time by less than 60 seconds
        await act(async () => {
            jest.advanceTimersByTime(30000);
        });

        // Simulate user interaction
        fireEvent.click(screen.getByText("💖 testUser's Favorite Songs"));

        // Fast-forward time again
        await act(async () => {
            jest.advanceTimersByTime(30000);
        });

        // Logout should not have been called yet
        expect(window.localStorage.removeItem).not.toHaveBeenCalled();
        expect(window.location.reload).not.toHaveBeenCalled();

        // Now advance past the full 60 seconds from the reset
        await act(async () => {
            jest.advanceTimersByTime(31000);
        });

        // Now logout should be called
        expect(window.localStorage.removeItem).toHaveBeenCalledWith('user');

        jest.useRealTimers();
    });

    test('toggles song expansion when song is clicked', async () => {
        render(
            <BrowserRouter>
                <Favorites user={mockUser} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Test Song 1/)).toBeInTheDocument();
        });

        // Artist info should not be visible initially
        expect(screen.queryByText(/Artist:/)).not.toBeInTheDocument();

        // Click to expand
        const songTitleElements = screen.getAllByText(/Test Song/);
        fireEvent.click(songTitleElements[0]);

        // Artist info should now be visible
        await waitFor(() => {
            expect(screen.getByText(/Artist:/)).toBeInTheDocument();
            expect(screen.getByText(/Test Artist 1/)).toBeInTheDocument();
        });

        // Click again to collapse
        fireEvent.click(songTitleElements[0]);

        // Artist info should not be visible again
        await waitFor(() => {
            expect(screen.queryByText(/Artist:/)).not.toBeInTheDocument();
        });
    });

    //
    // NOTE: The following tests changed to simulate hover before clicking remove/move.
    //

    test('removes a song from favorites', async () => {
        render(
            <BrowserRouter>
                <Favorites user={mockUser} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
        });

        // Hover over song 1's <li> so the Remove button appears
        const song1Li = screen.getByText('Test Song 1').closest('li');
        fireEvent.mouseEnter(song1Li);

        // Now the remove button is in the DOM
        const removeButtons = screen.getAllByText('❌ Remove');
        fireEvent.click(removeButtons[0]);

        const confirmRemove = screen.getAllByText('Yes, remove song');
        fireEvent.click(confirmRemove[0]);

        expect(axios.delete).toHaveBeenCalledWith(
            `http://localhost:8080/api/favorites/remove/${mockUser}/1`
        );
        expect(axios.get).toHaveBeenCalledTimes(3); // Initial load and after deletion
    });

    test('moves a favorite up', async () => {
        render(
            <BrowserRouter>
                <Favorites user={mockUser} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Test Song 2')).toBeInTheDocument();
        });

        // Hover over song 2's <li> so the up arrow appears
        const song2Li = screen.getByText('Test Song 2').closest('li');
        fireEvent.mouseEnter(song2Li);

        const upButtons = screen.getAllByText('⬆️');
        fireEvent.click(upButtons[0]); // or upButtons[1], depending on test indexing

        expect(axios.post).toHaveBeenCalledWith(
            'http://localhost:8080/api/favorites/swap',
            null,
            {
                params: {
                    username: mockUser,
                    rank1: 2,
                    rank2: 1
                }
            }
        );
    });

    test('moves a favorite down', async () => {
        render(
            <BrowserRouter>
                <Favorites user={mockUser} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
        });

        // Hover over song 1's <li> so the down arrow appears
        const song1Li = screen.getByText('Test Song 1').closest('li');
        fireEvent.mouseEnter(song1Li);

        const downButtons = screen.getAllByText('⬇️');
        fireEvent.click(downButtons[0]);

        expect(axios.post).toHaveBeenCalledWith(
            'http://localhost:8080/api/favorites/swap',
            null,
            {
                params: {
                    username: mockUser,
                    rank1: 1,
                    rank2: 2
                }
            }
        );
    });

    test('does not allow invalid moves (beyond array bounds)', async () => {
        render(
            <BrowserRouter>
                <Favorites user={mockUser} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
        });

        // Hover over first song so Up button appears
        const song1Li = screen.getByText('Test Song 1').closest('li');
        fireEvent.mouseEnter(song1Li);

        // Try to move first song up (should do nothing)
        const upButtons = screen.getAllByText('⬆️');
        fireEvent.click(upButtons[0]);
        expect(axios.post).not.toHaveBeenCalled();

        // Hover over second song so Down button appears
        const song2Li = screen.getByText('Test Song 2').closest('li');
        fireEvent.mouseEnter(song2Li);

        // Try to move last song down (should do nothing)
        const downButtons = screen.getAllByText('⬇️');
        fireEvent.click(downButtons[0]);
        expect(axios.post).not.toHaveBeenCalled();
    });

    test('handles swap ranks error', async () => {
        console.error = jest.fn(); // Mock console.error
        axios.post.mockRejectedValueOnce(new Error('Swap failed'));

        render(
            <BrowserRouter>
                <Favorites user={mockUser} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
        });

        // Hover over first song so the down button appears
        const song1Li = screen.getByText('Test Song 1').closest('li');
        fireEvent.mouseEnter(song1Li);

        const downButtons = screen.getAllByText('⬇️');
        fireEvent.click(downButtons[0]);

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith(
                'Error swapping ranks:',
                expect.any(Error)
            );
        });
    });

    test('handles null response data gracefully in fetchFavorites', async () => {
        axios.get.mockResolvedValueOnce({ data: null });

        render(
            <BrowserRouter>
                <Favorites user={mockUser} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('No favorite songs yet.')).toBeInTheDocument();
        });
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

    test('handles remove from favorites error', async () => {
        console.error = jest.fn(); // Mock console.error
        axios.delete.mockRejectedValueOnce(new Error('Delete failed'));

        render(
            <BrowserRouter>
                <Favorites user={mockUser} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
        });

        // Hover over song 1 so the remove button appears
        const song1Li = screen.getByText('Test Song 1').closest('li');
        fireEvent.mouseEnter(song1Li);

        const removeButtons = screen.getAllByText('❌ Remove');
        fireEvent.click(removeButtons[0]);

        const confirmRemove = screen.getAllByText('Yes, remove song');
        fireEvent.click(confirmRemove[0]);

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith(
                'Error removing from favorites:',
                expect.any(Error)
            );
        });
    });

    test('handles remove cancellation', async () => {
        render(
            <BrowserRouter>
                <Favorites user={mockUser} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
        });

        // Hover over song 1's <li> so the Remove button appears
        const song1Li = screen.getByText('Test Song 1').closest('li');
        fireEvent.mouseEnter(song1Li);

        // Now the remove button is in the DOM
        const removeButtons = screen.getAllByText('❌ Remove');
        fireEvent.click(removeButtons[0]);

        const declineRemove = screen.getAllByText('No');
        fireEvent.click(declineRemove[0]);


        expect(screen.getByText('Test Song 1')).toBeInTheDocument();
    });

    test('filters out invalid songs from API response', async () => {
        // API returns some invalid songs without songId
        axios.get.mockResolvedValueOnce({
            data: [
                ...mockFavorites,
                null,
                { title: 'Invalid Song', artistName: 'No ID' },
                { songId: '', title: 'Empty ID' }
            ]
        });

        render(
            <BrowserRouter>
                <Favorites user={mockUser} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getAllByText(/Test Song/)).toHaveLength(2);
            expect(screen.queryByText('Invalid Song')).not.toBeInTheDocument();
            expect(screen.queryByText('Empty ID')).not.toBeInTheDocument();
        });
    });

    test('hides action buttons on mouse leave', async () => {
        render(
            <BrowserRouter>
                <Favorites user={mockUser} />
            </BrowserRouter>
        );

        // Wait for songs to load
        await waitFor(() => {
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
        });

        // Hover over the first song so the action buttons appear
        const song1Li = screen.getByText('Test Song 1').closest('li');
        fireEvent.mouseEnter(song1Li);

        // Confirm the Remove button is now visible
        expect(screen.queryByText('❌ Remove')).toBeInTheDocument();

        // Trigger mouse leave
        fireEvent.mouseLeave(song1Li);

        // The Remove button should no longer be visible
        await waitFor(() => {
            expect(screen.queryByText('❌ Remove')).not.toBeInTheDocument();
        });
    });

});
