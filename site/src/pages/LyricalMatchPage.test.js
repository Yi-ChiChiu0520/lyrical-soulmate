import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import LyricalMatchPage from './LyricalMatchPage'; // adjust path as needed
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';

jest.mock('axios');

const mockFavorites = [
    { lyrics: 'love love peace', title: 'Love Song', artistName: 'A', songId: '1' },
    { lyrics: 'peace harmony', title: 'Peace Song', artistName: 'B', songId: '2' }
];

const mockAllWordmaps = {
    alice: {
        favorites: [
            { lyrics: 'love harmony', title: 'Harmony Tune', artistName: 'X', songId: '3' }
        ],
        wordMap: { love: 1, harmony: 1 }
    },
    bob: {
        favorites: [
            { lyrics: 'war hate', title: 'Angry Anthem', artistName: 'Y', songId: '4' }
        ],
        wordMap: { war: 1, hate: 1 }
    }
};



describe('LyricalMatchPage', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });
    test('renders soulmate and enemy correctly', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/favorites/testuser')) {
                return Promise.resolve({ data: mockFavorites });
            }
            if (url.includes('/api/favorites/all-wordmaps')) {
                return Promise.resolve({ data: mockAllWordmaps });
            }
            return Promise.reject(new Error('Unknown URL'));
        });

        render(<LyricalMatchPage user="testuser" />);

        expect(screen.getByText(/Find Your Lyrical Soulmate/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText(/🎵 Your Lyrical Soulmate: alice/)).toBeInTheDocument();
            expect(screen.getByText(/🖤 Your Lyrical Enemy: bob/)).toBeInTheDocument();
        });

        expect(screen.getByText(/Harmony Tune — X/)).toBeInTheDocument();
        expect(screen.getByText(/Angry Anthem — Y/)).toBeInTheDocument();
    });

    test('shows soulmate celebration overlay when mutual', async () => {
        // Force mutual soulmate logic
        const mutualData = {
            alice: {
                favorites: mockFavorites,
                wordMap: { love: 2, peace: 1 }
            }
        };

        axios.get.mockImplementation((url) => {
            if (url.includes('/api/favorites/testuser')) {
                return Promise.resolve({ data: mockFavorites });
            }
            if (url.includes('/api/favorites/all-wordmaps')) {
                return Promise.resolve({ data: mutualData });
            }
        });

        render(<LyricalMatchPage user="testuser" />);

        await waitFor(() => {
            expect(screen.getByText(/You're each other's lyrical soulmate/)).toBeInTheDocument();
        });
    });

    test('handles fetch failure gracefully', async () => {
        axios.get.mockRejectedValue(new Error('Network error'));

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        render(<LyricalMatchPage user="testuser" />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('❌ Failed to fetch lyrical match data'), expect.any(Error));
        });

        consoleSpy.mockRestore();
    });

    jest.useFakeTimers();


    test('mutual soulmate and mutual enemy triggers both overlays', async () => {
        const mutualData = {
            alice: {
                favorites: mockFavorites,
                wordMap: { love: 2, peace: 1 }
            }
        };

        axios.get.mockImplementation((url) => {
            if (url.includes('/api/favorites/testuser')) {
                return Promise.resolve({ data: mockFavorites });
            }
            if (url.includes('/api/favorites/all-wordmaps')) {
                return Promise.resolve({ data: mutualData });
            }
        });

        render(<LyricalMatchPage user="testuser" />);

        await waitFor(() => {
            expect(screen.getByText("🎉 You're each other's lyrical soulmate!")).toBeInTheDocument();
        });

        // Advance 4s: celebration ends, sinister starts
        act(() => {
            jest.advanceTimersByTime(4000);
        });

        await waitFor(() => {
            expect(screen.getByText("😈 You're each other's lyrical enemy...")).toBeInTheDocument();
        });

        // Advance another 4s: sinister overlay should now fade
        act(() => {
            jest.advanceTimersByTime(4000);
        });

        await waitFor(() => {
            const overlay = screen.getByText("😈 You're each other's lyrical enemy...");
            expect(overlay).toHaveStyle("opacity: 0");
        });
    });

    test('does nothing when there are no other users to compare', async () => {
        const mockUserData = [
            { lyrics: 'dream high love', title: 'Dream Song', artistName: 'Sky', songId: '10' }
        ];

        // Only testuser appears, so after filtering, `scored.length === 0`
        const mockOthers = {
            testuser: {
                favorites: mockUserData,
                wordMap: { dream: 1, high: 1, love: 1 }
            }
        };

        axios.get.mockImplementation((url) => {
            if (url.includes('/favorites/testuser')) {
                return Promise.resolve({ data: mockUserData });
            }
            if (url.includes('/favorites/all-wordmaps')) {
                return Promise.resolve({ data: mockOthers });
            }
        });

        render(<LyricalMatchPage user="testuser" />);

        await waitFor(() => {
            // These are the MATCHED user headers, not the main title
            expect(screen.queryByText(/🎵 Your Lyrical Soulmate:/)).not.toBeInTheDocument();
            expect(screen.queryByText(/🖤 Your Lyrical Enemy:/)).not.toBeInTheDocument();
        });
    });
    test('most similar user prefers someone else — not a mutual soulmate', async () => {
        const userFavorites = [
            { lyrics: 'bright hope love', title: 'Shine', artistName: 'Ray', songId: '10' }
        ];

        const otherUsers = {
            bob: {
                favorites: [
                    { lyrics: 'bright hope love unity', title: 'Connected', artistName: 'One', songId: '30' }
                ],
                wordMap: { bright: 1, hope: 1, love: 1, unity: 1 }
            },
            alice: {
                favorites: [
                    { lyrics: 'bright hope love unity trust', title: 'Trusted Tune', artistName: 'Moon', songId: '40' }
                ],
                wordMap: { bright: 1, hope: 1, love: 1, unity: 1, trust: 1 }
            }
        };

        /**
         * Similarity:
         * testuser ↔️ bob = 3 shared words / 5 total = 0.6
         * bob ↔️ alice = 4 shared words / 5 total = 0.8 ✅ higher
         * → bob prefers alice → isMutualSoulmate = false
         */

        axios.get.mockImplementation((url) => {
            if (url.includes('/favorites/testuser')) {
                return Promise.resolve({ data: userFavorites });
            }
            if (url.includes('/favorites/all-wordmaps')) {
                return Promise.resolve({ data: otherUsers });
            }
        });

        render(<LyricalMatchPage user="testuser" />);

        await waitFor(() => {
            expect(screen.getByText(/🎵 Your Lyrical Soulmate: bob/)).toBeInTheDocument();
            expect(screen.getByText(/🖤 Your Lyrical Enemy: alice/)).toBeInTheDocument();
        });

        // ❌ This overlay should NOT appear
        expect(screen.queryByText(/You're each other's lyrical soulmate/)).not.toBeInTheDocument();
    });
    test('triggers mutual enemy check branch: isMutualEnemy becomes false', async () => {
        // Test user favorites produce word map: { love, peace, unity }
        const testUserFavorites = [
            { lyrics: 'love peace unity', title: 'Test Song', artistName: 'Tester', songId: '1' }
        ];

        // Bob (enemy candidate) favorites: { war, love }
        const bobFavorites = [
            { lyrics: 'war love', title: 'Bob Song', artistName: 'Bob', songId: '2' }
        ];

        // Charlie favorites: { peace, unity }
        const charlieFavorites = [
            { lyrics: 'peace unity', title: 'Charlie Song', artistName: 'Charlie', songId: '3' }
        ];

        // The API for test user returns testUserFavorites.
        // The API for all-wordmaps returns bob and charlie.
        const mockAllWordmaps = {
            bob: {
                favorites: bobFavorites,
                // Manually provide the expected word map, or let your component generate it:
                // Expected: { war: 1, love: 1 }
                wordMap: { war: 1, love: 1 }
            },
            charlie: {
                favorites: charlieFavorites,
                // Expected: { peace: 1, unity: 1 }
                wordMap: { peace: 1, unity: 1 }
            }
        };

        axios.get.mockImplementation((url) => {
            if (url.includes('/favorites/testuser')) {
                return Promise.resolve({ data: testUserFavorites });
            }
            if (url.includes('/favorites/all-wordmaps')) {
                return Promise.resolve({ data: mockAllWordmaps });
            }
            return Promise.reject(new Error('Unknown URL'));
        });

        render(<LyricalMatchPage user="testuser" />);

        // Wait for the enemy (least similar user) to be rendered.
        await waitFor(() => {
            expect(screen.getByText(/🖤 Your Lyrical Enemy: bob/)).toBeInTheDocument();
        });

        // Since bob's similarity with test user (0.25) is greater than
        // computeSimilarity(bob, charlie) (0), the for loop inside
        // the enemy check will flip isMutualEnemy to false.
        // This means the mutual enemy overlay SHOULD NOT appear.
        expect(screen.queryByText("😈 You're each other's lyrical enemy...")).not.toBeInTheDocument();
    });


});
