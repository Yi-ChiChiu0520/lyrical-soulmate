import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import userEvent from "@testing-library/user-event";
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

        expect(screen.getByText('Find Friends')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Search by username')).toBeInTheDocument();
        expect(screen.getByText('Compare Selected')).toBeInTheDocument();
        expect(screen.getByText('Favorite Songs by You and Friends')).toBeInTheDocument();
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

    test('selects and deselects suggestions with checkboxes', async () => {
        render(<ComparePage user={mockUser} />);

        const searchInput = screen.getByPlaceholderText('Search by username');
        fireEvent.change(searchInput, { target: { value: 'fr' } });

        await waitFor(() => {
            expect(screen.getByText('friend1')).toBeInTheDocument();
        });

        // Get all checkboxes
        const checkboxes = screen.getAllByRole('checkbox');

        // Select friend1
        fireEvent.click(checkboxes[0]);
        expect(checkboxes[0]).toBeChecked();

        // Select friend2
        fireEvent.click(checkboxes[1]);
        expect(checkboxes[1]).toBeChecked();

        // Deselect friend1
        fireEvent.click(checkboxes[0]);
        expect(checkboxes[0]).not.toBeChecked();
        expect(checkboxes[1]).toBeChecked();
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

    test('ranks songs correctly based on number of friends', async () => {
        // Modify axios mock to return different data for friend1
        axios.get.mockImplementation((url) => {
            if (url.includes('/users/search')) {
                return Promise.resolve({ data: mockSuggestions });
            } else if (url.includes(`/api/favorites/${mockUser}`)) {
                return Promise.resolve({ data: mockFavorites });
            } else if (url.includes('/api/favorites/privacy/')) {
                return Promise.resolve({ data: false });
            } else if (url.includes('/api/favorites/friend1')) {
                return Promise.resolve({ data: [mockFavorites[0]] }); // Only contains Test Song 1
            }
            return Promise.reject(new Error('Not found'));
        });

        render(<ComparePage user={mockUser} />);

        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
            expect(screen.getByText('Test Song 2')).toBeInTheDocument();
        });

        // Search and add friend1
        const searchInput = screen.getByPlaceholderText('Search by username');
        fireEvent.change(searchInput, { target: { value: 'fr' } });

        await waitFor(() => {
            expect(screen.getByText('friend1')).toBeInTheDocument();
        });

        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]);
        fireEvent.click(screen.getByText('Compare Selected'));

        await waitFor(() => {
            // Test Song 1 should be #1 with 2 friends
            const rankElements = screen.getAllByText(/#\d+/);
            expect(rankElements[0].textContent).toBe('#1');

            // Test Song 2 should be #2 with 1 friend
            expect(rankElements[1].textContent).toBe('#2');
        });
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

        // Search and add friend1
        const searchInput = screen.getByPlaceholderText('Search by username');
        fireEvent.change(searchInput, { target: { value: 'fr' } });

        await waitFor(() => {
            expect(screen.getByText('friend1')).toBeInTheDocument();
        });

        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]);
        fireEvent.click(screen.getByText('Compare Selected'));

        await waitFor(() => {
            expect(screen.getByText("⚠️ friend1's favorites are private.")).toBeInTheDocument();
        });
    });

    test('handles API error when fetching friend favorites', async () => {
        // Set friend1 to fail with 500
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

        // Search and add friend1
        const searchInput = screen.getByPlaceholderText('Search by username');
        fireEvent.change(searchInput, { target: { value: 'fr' } });

        await waitFor(() => {
            expect(screen.getByText('friend1')).toBeInTheDocument();
        });

        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]);
        fireEvent.click(screen.getByText('Compare Selected'));

        await waitFor(() => {
            expect(screen.getByText("⚠️ Could not load favorites for friend1.")).toBeInTheDocument();
        });
    });

    test('handles API error with 403 status when fetching friend favorites', async () => {
        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {
            // Suppress expected console.error output in test
        });

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

        const searchInput = screen.getByPlaceholderText('Search by username');
        fireEvent.change(searchInput, { target: { value: 'fr' } });

        await waitFor(() => {
            expect(screen.getByText('friend1')).toBeInTheDocument();
        });

        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]);
        fireEvent.click(screen.getByText('Compare Selected'));

        await waitFor(() => {
            expect(screen.getByText("⚠️ friend1's favorites are private.")).toBeInTheDocument();
        });

        consoleErrorSpy.mockRestore(); // Optional: restore console after test
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
        console.error = jest.fn(); // Mock console.error to prevent test output noise

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
        fireEvent.click(screen.getByText('Find Friends'));

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

    test('does not add duplicate friends', async () => {
        render(<ComparePage user={mockUser} />);

        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
        });

        // Search and add friend1
        const searchInput = screen.getByPlaceholderText('Search by username');
        fireEvent.change(searchInput, { target: { value: 'fr' } });

        await waitFor(() => {
            expect(screen.getByText('friend1')).toBeInTheDocument();
        });

        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]);
        fireEvent.click(screen.getByText('Compare Selected'));

        // Clear search and try to add the same friend again
        fireEvent.change(searchInput, { target: { value: 'fr' } });

        await waitFor(() => {
            expect(screen.getByText('friend1')).toBeInTheDocument();
        });

        const newCheckboxes = screen.getAllByRole('checkbox');
        fireEvent.click(newCheckboxes[0]);
        fireEvent.click(screen.getByText('Compare Selected'));

        // Verify axios.get was called only once for friend1's favorites
        const friendRequestCalls = axios.get.mock.calls.filter(
            call => call[0].includes('/api/favorites/friend1?requester=testUser')
        );
        expect(friendRequestCalls.length).toBe(1);
    });

    test('clears selections after adding friends', async () => {
        render(<ComparePage user={mockUser} />);

        // Search for friends
        const searchInput = screen.getByPlaceholderText('Search by username');
        fireEvent.change(searchInput, { target: { value: 'fr' } });

        await waitFor(() => {
            expect(screen.getByText('friend1')).toBeInTheDocument();
        });

        // Select friend1
        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]);

        // Click compare selected
        fireEvent.click(screen.getByText('Compare Selected'));

        // Verify that search input is cleared
        await waitFor(() => {
            expect(searchInput.value).toBe('');
            expect(screen.queryByText('friend1')).not.toBeInTheDocument();
        });
    });

    test('skips already added friends when bulk adding', async () => {
        // First render and add friend1
        render(<ComparePage user={mockUser} />);

        await waitFor(() => {
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
        });

        let searchInput = screen.getByPlaceholderText('Search by username');
        fireEvent.change(searchInput, { target: { value: 'fr' } });

        await waitFor(() => {
            expect(screen.getByText('friend1')).toBeInTheDocument();
        });

        let checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]);
        fireEvent.click(screen.getByText('Compare Selected'));

        // Now try to add friend1 and friend2
        await waitFor(() => {
            expect(searchInput.value).toBe('');
        });

        fireEvent.change(searchInput, { target: { value: 'fr' } });

        await waitFor(() => {
            expect(screen.getByText('friend1')).toBeInTheDocument();
            expect(screen.getByText('friend2')).toBeInTheDocument();
        });

        checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]); // friend1 (already added)
        fireEvent.click(checkboxes[1]); // friend2 (new)

        // Reset the axios mock to track new calls
        axios.get.mockClear();

        fireEvent.click(screen.getByText('Compare Selected'));

        await waitFor(() => {
            // Should only call for friend2's privacy and favorites, not friend1
            const privacyCalls = axios.get.mock.calls.filter(
                call => call[0].includes('/api/favorites/privacy/')
            );
            expect(privacyCalls.length).toBe(1);
            expect(privacyCalls[0][0]).toContain('friend2');

            const favoritesCalls = axios.get.mock.calls.filter(
                call => call[0].includes('/api/favorites/') && !call[0].includes('/privacy/')
            );
            expect(favoritesCalls.length).toBe(1);
            expect(favoritesCalls[0][0]).toContain('friend2');
        });
    });
});

describe('mergeSongs function', () => {
    test('merges songs with no existing songs', () => {
        const user = 'testUser';
        const songs = [
            { songId: '1', title: 'Song 1', artistName: 'Artist 1', releaseDate: '2023-01-01' }
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
            { songId: '1', title: 'Song 1', artistName: 'Artist 1', releaseDate: '2023-01-01' }
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

    test('handles song with missing artistName', () => {
        const user = 'testUser';
        const songs = [
            { songId: '1', title: 'Song 1', releaseDate: '2023-01-01' }
        ];
        const existingSongMap = {};

        const result = mergeSongs(user, songs, existingSongMap);

        expect(result).toEqual({
            '1': {
                songId: '1',
                title: 'Song 1',
                artistName: 'Unknown',
                releaseDate: '2023-01-01',
                users: ['testUser']
            }
        });
    });

    test('handles song with id instead of songId', () => {
        const user = 'testUser';
        const songs = [
            { id: '1', title: 'Song 1', artistName: 'Artist 1', releaseDate: '2023-01-01' }
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

    test('does not add duplicate users', () => {
        const user = 'testUser';
        const songs = [
            { songId: '1', title: 'Song 1', artistName: 'Artist 1', releaseDate: '2023-01-01' }
        ];
        const existingSongMap = {
            '1': {
                songId: '1',
                title: 'Song 1',
                artistName: 'Artist 1',
                releaseDate: '2023-01-01',
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
                users: ['testUser']
            }
        });
    });

    test("does not fetch data or render UI if user is not provided", async () => {
        render(<ComparePage user={null} />);

        expect(axios.get).not.toHaveBeenCalled();
        expect(screen.queryByText("Find Friends")).not.toBeInTheDocument();
        expect(screen.queryByPlaceholderText("Search by username")).not.toBeInTheDocument();
        expect(screen.queryByText("Favorite Songs by You and Friends")).not.toBeInTheDocument();
    });



});

describe('RankHover Component', () => {
    test('shows and hides usernames on hover', async () => {
        const mockOnClick = jest.fn();
        const usernames = ['user1', 'user2'];

        render(<RankHover rank={1} usernames={usernames} onClick={mockOnClick} />);

        // It should initially only show the rank, not the user list
        expect(screen.getByText('#1')).toBeInTheDocument();
        expect(screen.queryByText('Users:')).not.toBeInTheDocument();

        // Simulate mouse enter (hover)
        fireEvent.mouseEnter(screen.getByText('#1'));

        // Now the users should appear
        await waitFor(() => {
            expect(screen.getByText('Users:')).toBeInTheDocument();
            expect(screen.getByText('user1')).toBeInTheDocument();
            expect(screen.getByText('user2')).toBeInTheDocument();
        });

        // Simulate mouse leave
        fireEvent.mouseLeave(screen.getByText('#1'));

        // Now the users should disappear
        await waitFor(() => {
            expect(screen.queryByText('Users:')).not.toBeInTheDocument();
            expect(screen.queryByText('user1')).not.toBeInTheDocument();
            expect(screen.queryByText('user2')).not.toBeInTheDocument();
        });
    });

    test('handles click event on RankHover', () => {
        const mockOnClick = jest.fn();
        const usernames = ['user1'];

        render(<RankHover rank={1} usernames={usernames} onClick={mockOnClick} />);

        fireEvent.click(screen.getByText('#1'));

        expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
    test('toggles song details when clicking RankHover', async () => {
        // Setup axios mocks
        axios.get.mockImplementation((url) => {
            if (url.includes(`/api/favorites/${mockUser}`)) {
                return Promise.resolve({ data: mockFavorites });
            }
            if (url.includes('/users/search')) {
                return Promise.resolve({ data: [] });
            }
            if (url.includes('/api/favorites/privacy/')) {
                return Promise.resolve({ data: false });
            }
            return Promise.reject(new Error('Not found'));
        });

        render(<ComparePage user={mockUser} />);

        // Wait until the songs load
        await waitFor(() => {
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
        });

        expect(screen.queryByText('Artist: Test Artist 1')).not.toBeInTheDocument();

        // Get all #1 badges
        const rankElements = screen.getAllByText('#1');

        // Click the first rank badge
        fireEvent.click(rankElements[0]);

        await waitFor(() => {
            expect(screen.getByText('Artist: Test Artist 1')).toBeInTheDocument();
            expect(screen.getByText('Release Date: 2023-01-01')).toBeInTheDocument();
        });

        // Click again to collapse
        fireEvent.click(rankElements[0]);

        await waitFor(() => {
            expect(screen.queryByText('Artist: Test Artist 1')).not.toBeInTheDocument();
        });
    });


});
describe('UserHover Component', () => {
    test('shows and hides usernames on hover over favorited count', async () => {
        const usernames = ['alice', 'bob'];

        render(
            <UserHover usernames={usernames}>
                <div>2 favorited</div>
            </UserHover>
        );

        // Initially only "2 favorited" should show
        expect(screen.getByText('2 favorited')).toBeInTheDocument();
        expect(screen.queryByText('Users:')).not.toBeInTheDocument();

        // Hover over "2 favorited"
        fireEvent.mouseEnter(screen.getByText('2 favorited'));

        await waitFor(() => {
            expect(screen.getByText('Users:')).toBeInTheDocument();
            expect(screen.getByText('alice')).toBeInTheDocument();
            expect(screen.getByText('bob')).toBeInTheDocument();
        });

        // Mouse leave
        fireEvent.mouseLeave(screen.getByText('2 favorited'));

        await waitFor(() => {
            expect(screen.queryByText('Users:')).not.toBeInTheDocument();
            expect(screen.queryByText('alice')).not.toBeInTheDocument();
            expect(screen.queryByText('bob')).not.toBeInTheDocument();
        });
    });
});

describe('compare page is keyboard navigable', () => {
    test("can tab and collapse/expand with enter", async() => {
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

        render(<ComparePage user={mockUser} />);

        const usere = userEvent.setup();
        const tabUntilLabel = async (label) => {
            let focused = document.activeElement;
            let maxTabs = 20;
            while (maxTabs > 0) {
                if (focused.hasAttribute('aria-label') && focused.getAttribute('aria-label').includes(label)) {
                    break;
                }
                await usere.tab();
                focused = document.activeElement;
                maxTabs--;
            }
        }

        await tabUntilLabel("Favorite song");
        await usere.keyboard('[Enter]');

        expect(await screen.findByText(/artist:/i)).toBeInTheDocument();
        expect(await screen.findByText(/release date:/i)).toBeInTheDocument();

        await tabUntilLabel("Song rank ");
        await tabUntilLabel("Users who like this song");

    })
})