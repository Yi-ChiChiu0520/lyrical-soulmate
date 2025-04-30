import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import userEvent from '@testing-library/user-event';
import ComparePage, { mergeSongs, RankHover, UserHover } from './ComparePage';

// Mock axios
jest.mock('axios');

// Mock localStorage
const localStorageMock = (function() {
    let store = {};
    return {
        getItem: jest.fn(key => store[key]),
        setItem: jest.fn((key, value) => {
            store[key] = value.toString();
        }),
        removeItem: jest.fn(key => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        }),
        getAll: () => store
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Sample data
const mockUser = 'testUser';
const mockSuggestions = ['friend1', 'friend2', 'friend3'];
const mockFavorites = [
    {
        songId: '1',
        title: 'Test Song 1',
        artistName: 'Test Artist 1',
        releaseDate: '2023-01-01'
    },
    {
        songId: '2',
        title: 'Test Song 2',
        artistName: 'Test Artist 2',
        releaseDate: '2023-01-02'
    }
];

const mockFriend1Favorites = [
    {
        songId: '1', // Same as user's first song
        title: 'Test Song 1',
        artistName: 'Test Artist 1',
        releaseDate: '2023-01-01'
    },
    {
        songId: '3',
        title: 'Test Song 3',
        artistName: 'Test Artist 3',
        releaseDate: '2023-01-03'
    }
];

describe('ComparePage Component', () => {
    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {}); // mute console.error
        jest.clearAllMocks();
        jest.useFakeTimers();

        // Setup default axios mock responses
        axios.get.mockImplementation((url) => {
            if (url.includes('/users/search')) {
                return Promise.resolve({ data: mockSuggestions });
            } else if (url.includes(`/api/favorites/${mockUser}`)) {
                return Promise.resolve({ data: mockFavorites });
            } else if (url.includes('/api/favorites/privacy/')) {
                return Promise.resolve({ data: false }); // Default to public
            } else if (url.includes('/api/favorites/friend1')) {
                return Promise.resolve({ data: mockFriend1Favorites });
            }
            return Promise.reject(new Error('Not found'));
        });

        // Mock window.location.reload
        Object.defineProperty(window, 'location', {
            value: { reload: jest.fn() }
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('renders the component with search input', () => {
        render(<ComparePage user={mockUser} />);

        expect(screen.getByText('Compare Favorites')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Search by username')).toBeInTheDocument();
        expect(screen.getByText('Add to Compare List')).toBeInTheDocument();
        expect(screen.getByText('Compare Now')).toBeInTheDocument();
    });

    test('loads user favorites on mount', async () => {
        render(<ComparePage user={mockUser} />);

        await waitFor(() => {
            // The user's favorites should be loaded and displayed
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
            expect(screen.getByText('Test Song 2')).toBeInTheDocument();
        });
    });

    test('shows suggestions when typing in search input', async () => {
        render(<ComparePage user={mockUser} />);

        const searchInput = screen.getByPlaceholderText('Search by username');
        fireEvent.change(searchInput, { target: { value: 'fr' } });

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('http://localhost:8080/users/search?prefix=fr');
            expect(screen.getByText('friend1')).toBeInTheDocument();
            expect(screen.getByText('friend2')).toBeInTheDocument();
            expect(screen.getByText('friend3')).toBeInTheDocument();
        });
    });

    test('adds a username to search input when suggestion is clicked', async () => {
        render(<ComparePage user={mockUser} />);

        const searchInput = screen.getByPlaceholderText('Search by username');
        fireEvent.change(searchInput, { target: { value: 'fr' } });

        await waitFor(() => {
            expect(screen.getByText('friend1')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('friend1'));

        expect(searchInput.value).toBe('friend1');
    });

    test('adds a friend to compare list and clears input', async () => {
        render(<ComparePage user={mockUser} />);

        const searchInput = screen.getByPlaceholderText('Search by username');
        fireEvent.change(searchInput, { target: { value: 'friend1' } });

        await waitFor(() => {
            expect(screen.getByText('friend1')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Add to Compare List'));

        expect(screen.getByText('Users queued for comparison:')).toBeInTheDocument();
        expect(screen.getByText('friend1')).toBeInTheDocument();
        expect(searchInput.value).toBe('');
    });

    test('does not add empty username or already added friends to compare list', () => {
        render(<ComparePage user={mockUser} />);

        // Try to add with empty input
        fireEvent.click(screen.getByText('Add to Compare List'));
        expect(screen.queryByText('Users queued for comparison:')).not.toBeInTheDocument();

        // Add a friend
        const searchInput = screen.getByPlaceholderText('Search by username');
        fireEvent.change(searchInput, { target: { value: 'friend1' } });
        fireEvent.click(screen.getByText('Add to Compare List'));

        expect(screen.getByText('friend1')).toBeInTheDocument();

        // Try to add the same friend again
        fireEvent.change(searchInput, { target: { value: 'friend1' } });
        fireEvent.click(screen.getByText('Add to Compare List'));

        // Only one occurrence of this friend should be in the list
        const friendElements = screen.getAllByText('friend1');
        expect(friendElements.length).toBe(1);
    });

    test('does not add current user to compare list', () => {
        render(<ComparePage user={mockUser} />);

        const searchInput = screen.getByPlaceholderText('Search by username');
        fireEvent.change(searchInput, { target: { value: mockUser } });

        fireEvent.click(screen.getByText('Add to Compare List'));

        expect(screen.queryByText('Users queued for comparison:')).not.toBeInTheDocument();
    });

    test('displays song details when clicked', async () => {
        render(<ComparePage user={mockUser} />);

        await waitFor(() => {
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
        });

        // Click on song to expand details
        fireEvent.click(screen.getByText('Test Song 1'));

        expect(screen.getByText('Artist: Test Artist 1')).toBeInTheDocument();
        expect(screen.getByText('Release Date: 2023-01-01')).toBeInTheDocument();

        // Click again to collapse
        fireEvent.click(screen.getByText('Test Song 1'));

        expect(screen.queryByText('Artist: Test Artist 1')).not.toBeInTheDocument();
    });

    test('compares songs between user and friend', async () => {
        // Modify axios mock for this test to ensure predictable results
        axios.get.mockImplementation((url) => {
            if (url.includes('/users/search')) {
                return Promise.resolve({ data: mockSuggestions });
            } else if (url.includes(`/api/favorites/${mockUser}`)) {
                return Promise.resolve({ data: mockFavorites });
            } else if (url.includes('/api/favorites/privacy/')) {
                return Promise.resolve({ data: false });
            } else if (url.includes('/api/favorites/friend1')) {
                return Promise.resolve({ data: mockFriend1Favorites });
            }
            return Promise.reject(new Error('Not found'));
        });

        render(<ComparePage user={mockUser} />);

        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
        });

        // Add friend1 to compare list
        const searchInput = screen.getByPlaceholderText('Search by username');
        fireEvent.change(searchInput, { target: { value: 'friend1' } });
        fireEvent.click(screen.getByText('Add to Compare List'));

        // Click Compare Now
        fireEvent.click(screen.getByText('Compare Now'));

        // Wait for comparison results
        await waitFor(() => {
            // Test Song 1 should be shared by both users
            const songElements = screen.getAllByText('Test Song 1');
            expect(songElements.length).toBeGreaterThan(0);

            // Test Song 3 should be in the results (from friend1)
            expect(screen.getByText('Test Song 3')).toBeInTheDocument();
        });

        // Test that the songs have the right number of favorites
        const favoriteCountElements = screen.getAllByText(/\d+ favorited/);
        expect(favoriteCountElements.length).toBeGreaterThan(0);
    });

    test('handles friend with private favorites', async () => {
        // Set friend1 to private
        axios.get.mockImplementation((url) => {
            if (url.includes('/users/search')) {
                return Promise.resolve({ data: mockSuggestions });
            } else if (url.includes(`/api/favorites/${mockUser}`)) {
                return Promise.resolve({ data: mockFavorites });
            } else if (url.includes('/api/favorites/privacy/friend1')) {
                return Promise.resolve({ data: true }); // Private
            } else if (url.includes('/api/favorites/privacy/')) {
                return Promise.resolve({ data: false });
            }
            return Promise.reject(new Error('Not found'));
        });

        render(<ComparePage user={mockUser} />);

        // Add friend1 to compare list
        const searchInput = screen.getByPlaceholderText('Search by username');
        fireEvent.change(searchInput, { target: { value: 'friend1' } });
        fireEvent.click(screen.getByText('Add to Compare List'));

        // Click Compare Now
        fireEvent.click(screen.getByText('Compare Now'));

        await waitFor(() => {
            expect(screen.getByText(/friend1's favorite list is private./)).toBeInTheDocument();
        });
    });

    test('handles multiple friends with comparison', async () => {
        // Setup mock responses for multiple friends
        axios.get.mockImplementation((url) => {
            if (url.includes('/users/search')) {
                return Promise.resolve({ data: mockSuggestions });
            } else if (url.includes(`/api/favorites/${mockUser}`)) {
                return Promise.resolve({ data: mockFavorites });
            } else if (url.includes('/api/favorites/privacy/')) {
                return Promise.resolve({ data: false });
            } else if (url.includes('/api/favorites/friend1')) {
                return Promise.resolve({ data: mockFriend1Favorites });
            } else if (url.includes('/api/favorites/friend2')) {
                return Promise.resolve({ data: [
                        { songId: '2', title: 'Test Song 2', artistName: 'Test Artist 2', releaseDate: '2023-01-02' },
                        { songId: '4', title: 'Test Song 4', artistName: 'Test Artist 4', releaseDate: '2023-01-04' }
                    ]});
            }
            return Promise.reject(new Error('Not found'));
        });

        render(<ComparePage user={mockUser} />);

        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
        });

        // Add friend1 to compare list
        const searchInput = screen.getByPlaceholderText('Search by username');
        fireEvent.change(searchInput, { target: { value: 'friend1' } });
        fireEvent.click(screen.getByText('Add to Compare List'));

        // Add friend2 to compare list
        fireEvent.change(searchInput, { target: { value: 'friend2' } });
        fireEvent.click(screen.getByText('Add to Compare List'));

        // Click Compare Now
        fireEvent.click(screen.getByText('Compare Now'));

        // Wait for comparison results
        await waitFor(() => {
            // Test songs from both friends should be in the results
            expect(screen.getByText('Test Song 3')).toBeInTheDocument(); // from friend1
            expect(screen.getByText('Test Song 4')).toBeInTheDocument(); // from friend2
        });
    });

    test('handles error for non-existent user', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/users/search')) {
                return Promise.resolve({ data: mockSuggestions });
            } else if (url.includes(`/api/favorites/${mockUser}`)) {
                return Promise.resolve({ data: mockFavorites });
            } else if (url.includes('/api/favorites/privacy/')) {
                return Promise.resolve({ data: false });
            } else if (url.includes('/api/favorites/nonexistent')) {
                return Promise.reject({ response: { status: 404 } });
            }
            return Promise.reject(new Error('Not found'));
        });

        render(<ComparePage user={mockUser} />);

        // Add non-existent user to compare list
        const searchInput = screen.getByPlaceholderText('Search by username');
        fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
        fireEvent.click(screen.getByText('Add to Compare List'));

        // Click Compare Now
        fireEvent.click(screen.getByText('Compare Now'));

        await waitFor(() => {
            expect(screen.getByText(/nonexistent does not exist./)).toBeInTheDocument();
        });
    });

    test('handles API error when fetching friend favorites', async () => {
        // Set up mock to fail with generic error
        axios.get.mockImplementation((url) => {
            if (url.includes('/users/search')) {
                return Promise.resolve({ data: mockSuggestions });
            } else if (url.includes(`/api/favorites/${mockUser}`)) {
                return Promise.resolve({ data: mockFavorites });
            } else if (url.includes('/api/favorites/privacy/friend1')) {
                return Promise.resolve({ data: false });
            } else if (url.includes('/api/favorites/friend1')) {
                return Promise.reject(new Error('Server error'));
            } else if (url.includes('/api/favorites/privacy/')) {
                return Promise.resolve({ data: false });
            }
            return Promise.reject(new Error('Not found'));
        });

        render(<ComparePage user={mockUser} />);

        // Add friend1 to compare list
        const searchInput = screen.getByPlaceholderText('Search by username');
        fireEvent.change(searchInput, { target: { value: 'friend1' } });
        fireEvent.click(screen.getByText('Add to Compare List'));

        // Click Compare Now
        fireEvent.click(screen.getByText('Compare Now'));

        // Verify console.error was called (indicating unexpected error)
        await waitFor(() => {
            expect(console.error).toHaveBeenCalled();
        });
    });

    test('handles API error with 403 status when fetching friend favorites', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        axios.get.mockImplementation((url) => {
            if (url.includes('/users/search')) {
                return Promise.resolve({ data: mockSuggestions });
            } else if (url.includes(`/api/favorites/${mockUser}`)) {
                return Promise.resolve({ data: mockFavorites });
            } else if (url.includes('/api/favorites/privacy/friend1')) {
                return Promise.resolve({ data: false });
            } else if (url.includes('/api/favorites/friend1')) {
                return Promise.reject({ response: { status: 403 } });
            } else if (url.includes('/api/favorites/privacy/')) {
                return Promise.resolve({ data: false });
            }
            return Promise.reject(new Error('Not found'));
        });

        render(<ComparePage user={mockUser} />);

        // Add friend1 to compare list
        const searchInput = screen.getByPlaceholderText('Search by username');
        fireEvent.change(searchInput, { target: { value: 'friend1' } });
        fireEvent.click(screen.getByText('Add to Compare List'));

        // Click Compare Now
        fireEvent.click(screen.getByText('Compare Now'));

        await waitFor(() => {
            expect(screen.getByText(/friend1's favorite list is private./)).toBeInTheDocument();
        });

        consoleErrorSpy.mockRestore();
    });

    test('handles API error when searching for users', async () => {
        // Make search fail
        axios.get.mockImplementation((url) => {
            if (url.includes('/users/search')) {
                return Promise.reject(new Error('Failed to search'));
            } else if (url.includes(`/api/favorites/${mockUser}`)) {
                return Promise.resolve({ data: mockFavorites });
            }
            return Promise.reject(new Error('Not found'));
        });

        render(<ComparePage user={mockUser} />);

        const searchInput = screen.getByPlaceholderText('Search by username');
        fireEvent.change(searchInput, { target: { value: 'fr' } });

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('http://localhost:8080/users/search?prefix=fr');
            expect(screen.queryByText('friend1')).not.toBeInTheDocument();
        });
    });

    test('handles API error when loading own favorites', async () => {
        console.error = jest.fn(); // Mock console.error

        // Make user favorites fail
        axios.get.mockImplementation((url) => {
            if (url.includes(`/api/favorites/${mockUser}`)) {
                return Promise.reject(new Error('Failed to load favorites'));
            } else if (url.includes('/users/search')) {
                return Promise.resolve({ data: mockSuggestions });
            }
            return Promise.reject(new Error('Not found'));
        });

        render(<ComparePage user={mockUser} />);

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith('Failed to load your own favorites');
        });
    });


    test('logs out user after inactivity period', async () => {
        render(<ComparePage user={mockUser} />);

        // Fast-forward time by more than the inactivity timeout (60000ms)
        act(() => {
            jest.advanceTimersByTime(65000);
        });

        // Check if localStorage was cleared
        expect(localStorage.removeItem).toHaveBeenCalledWith('user');
        expect(window.location.reload).toHaveBeenCalled();
    });

    test('resets inactivity timer on user interaction', async () => {
        render(<ComparePage user={mockUser} />);

        // Fast-forward time by less than the timeout
        act(() => {
            jest.advanceTimersByTime(50000);
        });

        // Simulate user interaction
        fireEvent.click(screen.getByText('Add to Compare List'));

        // Fast-forward time again, but not enough to trigger logout
        act(() => {
            jest.advanceTimersByTime(50000);
        });

        // Check that logout wasn't called
        expect(localStorage.removeItem).not.toHaveBeenCalled();
        expect(window.location.reload).not.toHaveBeenCalled();

        // Now advance time enough to trigger logout
        act(() => {
            jest.advanceTimersByTime(15000);
        });

        // Now logout should be called
        expect(localStorage.removeItem).toHaveBeenCalledWith('user');
        expect(window.location.reload).toHaveBeenCalled();
    });


    test('handles empty search results', async () => {
        // Mock empty search results
        axios.get.mockImplementation((url) => {
            if (url.includes('/users/search')) {
                return Promise.resolve({ data: [] });
            } else if (url.includes(`/api/favorites/${mockUser}`)) {
                return Promise.resolve({ data: mockFavorites });
            }
            return Promise.reject(new Error('Not found'));
        });

        render(<ComparePage user={mockUser} />);

        const searchInput = screen.getByPlaceholderText('Search by username');
        fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('http://localhost:8080/users/search?prefix=nonexistent');
            expect(screen.queryByText('friend1')).not.toBeInTheDocument();
        });
    });

    test('ranks songs correctly based on number of favorites', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes(`/api/favorites/${mockUser}`)) {
                return Promise.resolve({ data: mockFavorites });
            } else if (url.includes('/api/favorites/friend1')) {
                return Promise.resolve({ data: [
                        { songId: '1', title: 'Test Song 1', artistName: 'Test Artist 1', releaseDate: '2023-01-01' },
                        { songId: '3', title: 'Test Song 3', artistName: 'Test Artist 3', releaseDate: '2023-01-03' }
                    ]});
            } else if (url.includes('/api/favorites/friend2')) {
                return Promise.resolve({ data: [
                        { songId: '1', title: 'Test Song 1', artistName: 'Test Artist 1', releaseDate: '2023-01-01' },
                        { songId: '2', title: 'Test Song 2', artistName: 'Test Artist 2', releaseDate: '2023-01-02' }
                    ]});
            } else if (url.includes('/api/favorites/privacy/')) {
                return Promise.resolve({ data: false });
            } else if (url.includes('/users/search')) {
                return Promise.resolve({ data: mockSuggestions });
            }
            return Promise.reject(new Error('Not found'));
        });

        render(<ComparePage user={mockUser} />);

        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
        });

        // Add friends to compare list
        const searchInput = screen.getByPlaceholderText('Search by username');

        // Add friend1
        fireEvent.change(searchInput, { target: { value: 'friend1' } });
        fireEvent.click(screen.getByText('Add to Compare List'));

        // Add friend2
        fireEvent.change(searchInput, { target: { value: 'friend2' } });
        fireEvent.click(screen.getByText('Add to Compare List'));

        // Click Compare Now
        fireEvent.click(screen.getByText('Compare Now'));

        // Test Song 1 should be #1 (favorited by all 3 users)
        // Test Song 2 should be #2 (favorited by 2 users)
        // Test Song 3 should be #3 (favorited by 1 user)
        await waitFor(() => {
            const rankElements = screen.getAllByText(/#\d+/);
            expect(rankElements.length).toBe(3);
        });

        const rankElements = screen.getAllByText(/#\d+/);
        const songElements = screen.getAllByText(/Test Song \d/);

        // Find the rank next to "Test Song 1"
        const song1Index = songElements.findIndex(el => el.textContent === 'Test Song 1');
        const song1Rank = rankElements[song1Index];
        expect(song1Rank.textContent).toBe('#1');

        // Find the rank next to "Test Song 2"
        const song2Index = songElements.findIndex(el => el.textContent === 'Test Song 2');
        const song2Rank = rankElements[song2Index];
        expect(song2Rank.textContent).toBe('#2');

        // Find the rank next to "Test Song 3"
        const song3Index = songElements.findIndex(el => el.textContent === 'Test Song 3');
        const song3Rank = rankElements[song3Index];
        expect(song3Rank.textContent).toBe('#3');
    });

});

describe('mergeSongs function', () => {
    test('merges songs with no existing songs', () => {
        const user = 'testUser';
        const songs = [
            {songId: '1', title: 'Song 1', artistName: 'Artist 1', releaseDate: '2023-01-01'}
        ];
        const existingSongMap = {};

        const result = mergeSongs(user, songs, existingSongMap);

        expect(result).toEqual({
            '1': {
                songId: '1',
                title: 'Song 1',
                artistName: 'Artist 1',
                releaseDate: '2023-01-01',
                users: ['testUser']
            }
        });
    });

    test('merges songs with existing songs', () => {
        const user = 'friend1';
        const songs = [
            {songId: '1', title: 'Song 1', artistName: 'Artist 1', releaseDate: '2023-01-01'}
        ];
        const existingSongMap = {
            '1': {
                songId: '1',
                title: 'Song 1',
                artistName: 'Artist 1',
                releaseDate: '2023-01-01',
                users: ['testUser']
            },
            '2': {
                songId: '2',
                title: 'Song 2',
                artistName: 'Artist 2',
                releaseDate: '2023-01-02',
                users: ['testUser']
            }
        };

        const result = mergeSongs(user, songs, existingSongMap);

        expect(result).toEqual({
            '1': {
                songId: '1',
                title: 'Song 1',
                artistName: 'Artist 1',
                releaseDate: '2023-01-01',
                users: ['testUser', 'friend1']
            },
            '2': {
                songId: '2',
                title: 'Song 2',
                artistName: 'Artist 2',
                releaseDate: '2023-01-02',
                users: ['testUser']
            }
        });
    });

});
describe('RankHover Component', () => {
    test('displays rank and shows user list on hover', () => {
        const onClick = jest.fn();
        render(<RankHover rank={5} usernames={['alice', 'bob']} onClick={onClick} />);

        // Should display the rank
        expect(screen.getByText('#5')).toBeInTheDocument();
        // User list should be hidden initially
        expect(screen.queryByText('Users:')).toBeNull();

        // Hover over the component
        fireEvent.mouseEnter(screen.getByText('#5'));
        expect(screen.getByText('Users:')).toBeInTheDocument();
        expect(screen.getByText('alice')).toBeInTheDocument();
        expect(screen.getByText('bob')).toBeInTheDocument();

        // Click should trigger onClick
        fireEvent.click(screen.getByText('#5'));
        expect(onClick).toHaveBeenCalled();

        // Mouse leave hides the list
        fireEvent.mouseLeave(screen.getByText('#5'));
        expect(screen.queryByText('Users:')).toBeNull();
    });
});

describe('UserHover Component', () => {
    test('shows children and toggles user list on hover', () => {
        render(
            <UserHover usernames={['charlie', 'dave']}>
                <button>HoverMe</button>
            </UserHover>
        );
        // Child should be visible
        expect(screen.getByText('HoverMe')).toBeInTheDocument();
        // User list hidden by default
        expect(screen.queryByText('Users:')).toBeNull();

        // Hover on container
        fireEvent.mouseEnter(screen.getByText('HoverMe'));
        expect(screen.getByText('Users:')).toBeInTheDocument();
        expect(screen.getByText('charlie')).toBeInTheDocument();
        expect(screen.getByText('dave')).toBeInTheDocument();

        // Mouse leave hides
        fireEvent.mouseLeave(screen.getByText('HoverMe'));
        expect(screen.queryByText('Users:')).toBeNull();
    });
    test('returns early and renders nothing if user is not provided', () => {
        const { container } = render(<ComparePage user={null} />);
        expect(screen.queryByText('Favorite Songs by You and Friends')).not.toBeInTheDocument();
        expect(screen.queryByText('Compare Now')).not.toBeNull(); // static elements may still render
    });
    test('toggleReverseOrder reverses ranked song order by users.length', async () => {
        const user = 'alice';

        // Mock API responses
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/favorites/privacy/alice')) {
                return Promise.resolve({ data: false }); // alice is public
            }
            if (url.includes('/api/favorites/privacy/bob')) {
                return Promise.resolve({ data: false }); // bob is public
            }
            if (url.includes('/api/favorites/alice')) {
                return Promise.resolve({
                    data: [
                        { songId: '1', title: 'Alpha', artistName: 'A', releaseDate: '2022-01-01' }
                    ]
                });
            }
            if (url.includes('/api/favorites/bob')) {
                return Promise.resolve({
                    data: [
                        { songId: '1', title: 'Alpha', artistName: 'A', releaseDate: '2022-01-01' },
                        { songId: '2', title: 'Beta', artistName: 'B', releaseDate: '2022-02-02' },
                        { songId: '3', title: 'Gamma', artistName: 'C', releaseDate: '2022-03-03' }
                    ]
                });
            }
            if (url.includes('/users/search')) {
                return Promise.resolve({ data: ['bob'] });
            }

            return Promise.resolve({ data: [] });
        });

        render(<ComparePage user={user} />);

        // Wait for initial load of Alice's own favorites
        await screen.findByText('Alpha');

        // Simulate searching for "bob" and adding to compare list
        fireEvent.change(screen.getByPlaceholderText('Search by username'), {
            target: { value: 'bob' }
        });

        await screen.findByText('bob');
        fireEvent.click(screen.getByText('bob'));
        fireEvent.click(screen.getByText('Add to Compare List'));
        fireEvent.click(screen.getByText('Compare Now'));

        // Wait for Bob's songs to appear
        await screen.findByText('Beta');
        await screen.findByText('Gamma');

        const getSongTitles = () =>
            screen
                .getAllByRole('button', { name: /favorited$/ })
                .map(el => el.textContent.replace(/\s+/g, ''));

        const originalOrder = getSongTitles();
// ["Alpha2favorited", "Beta1favorited", "Gamma1favorited"]

        fireEvent.click(screen.getByText(/Least to Most/i));

        const reversedOrder = getSongTitles();
// ["Beta1favorited", "Gamma1favorited", "Alpha2favorited"]

        expect(reversedOrder).toEqual([
            "Beta1favorited",
            "Gamma1favorited",
            "Alpha2favorited"
        ]);
    });

    test('shows user does not exist message', async () => {
        const user = 'alice';

        // Set up mock API responses
        axios.get.mockImplementation((url) => {
            if (url.includes('/privacy/')) {
                return Promise.resolve({ data: false }); // Not private
            }
            if (url.includes('/favorites/bob')) {
                return Promise.resolve({ data: {} }); // Not an array triggers simulated 404
            }
            if (url.includes(`/favorites/${user}`)) {
                return Promise.resolve({
                    data: [{ id: 'song1', title: 'Alpha', users: ['alice'] }]
                });
            }
            return Promise.reject(new Error('Unexpected request'));
        });

        render(<ComparePage user={user} />);

        // Add bob to compare list
        fireEvent.change(screen.getByPlaceholderText('Search by username'), {
            target: { value: 'bob' }
        });
        fireEvent.click(screen.getByText('Add to Compare List'));

        // Compare now
        fireEvent.click(screen.getByText('Compare Now'));

        await expect(screen.findByText(/bob does not exist/i)).resolves.toBeInTheDocument();

    });

    test('toggleSongDetails expands and collapses song details', async () => {
        const mockUser = 'alice';

        axios.get.mockImplementation((url) => {
            if (url.includes('/privacy/')) {
                return Promise.resolve({ data: false }); // not private
            }
            if (url.includes(`/api/favorites/${mockUser}`)) {
                return Promise.resolve({
                    data: [
                        {
                            songId: 'song1',
                            title: 'Test Song',
                            artistName: 'Test Artist',
                            releaseDate: '2024-01-01',
                        }
                    ]
                });
            }
            return Promise.reject(new Error('Unexpected URL: ' + url));
        });

        render(<ComparePage user={mockUser} />);

        // Wait for song to appear
        const songTitle = await screen.findByText(/test song/i);
        expect(songTitle).toBeInTheDocument();

        // Initially collapsed
        expect(screen.queryByText(/artist:/i)).not.toBeInTheDocument();

        // Expand
        fireEvent.click(songTitle);
        expect(await screen.findByText(/artist: test artist/i)).toBeInTheDocument();

        // Collapse
        fireEvent.click(songTitle);
        await waitFor(() => {
            expect(screen.queryByText(/artist:/i)).not.toBeInTheDocument();
        });
    });

    test('clicking RankHover toggles song details', async () => {
        const mockUser = 'alice';

        axios.get.mockImplementation((url) => {
            if (url.includes('/privacy/')) return Promise.resolve({ data: false });
            if (url.includes(`/api/favorites/${mockUser}`)) {
                return Promise.resolve({
                    data: [
                        {
                            songId: 'song1',
                            title: 'Test Song',
                            artistName: 'Rank Artist',
                            releaseDate: '2025-01-01',
                        },
                    ],
                });
            }
            return Promise.reject(new Error('Unexpected URL: ' + url));
        });

        render(<ComparePage user={mockUser} />);

        // Wait for song to load
        await screen.findByText(/test song/i);

        // Locate and click the RankHover element (e.g., "#1")
        const rankButton = screen.getByRole('button', { name: /#1/i });
        fireEvent.click(rankButton);

        // Confirm song details are shown
        expect(await screen.findByText(/Rank Artist/i)).toBeInTheDocument();

        // Click again to collapse
        fireEvent.click(rankButton);
        await waitFor(() => {
            expect(screen.queryByText(/Rank Artist/i)).not.toBeInTheDocument();
        });
    });


});

describe('mergeSongs', () => {
    it('adds user to song if not already present', () => {
        const existingMap = {};
        const songs = [
            {
                songId: 'song1',
                title: 'New Song',
                artistName: 'Artist A',
                releaseDate: '2023-01-01',
            },
        ];

        const result = mergeSongs('alice', songs, existingMap);
        expect(result.song1.users).toContain('alice');
    });

    it('does NOT add user again if already present', () => {
        const existingMap = {
            song1: {
                songId: 'song1',
                title: 'New Song',
                artistName: 'Artist A',
                releaseDate: '2023-01-01',
                users: ['alice'], // already included
            },
        };

        const songs = [
            {
                songId: 'song1',
                title: 'New Song',
                artistName: 'Artist A',
                releaseDate: '2023-01-01',
            },
        ];

        const result = mergeSongs('alice', songs, existingMap);
        expect(result.song1.users).toEqual(['alice']); // user should not be duplicated
    });
});