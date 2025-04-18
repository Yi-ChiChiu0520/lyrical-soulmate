import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import LyricalMatchPage from './LyricalMatchPage';

jest.mock('axios');

describe('LyricalMatchPage', () => {
    const user = 'testuser';
    const userFavorites = [
        { songId: '1', title: 'Shine Bright', artistName: 'Star', lyrics: 'love joy peace' }
    ];

    const mockOthers = {
        alice: {
            favorites: [{ songId: '2', title: 'Joyful Tune', artistName: 'A', lyrics: 'joy peace' }],
            wordMap: { joy: 1, peace: 1 }
        },
        bob: {
            favorites: [{ songId: '3', title: 'Angry Anthem', artistName: 'B', lyrics: 'hate fear' }],
            wordMap: { hate: 1, fear: 1 }
        }
    };

    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllTimers();
        localStorage.setItem('user', user);
        Object.defineProperty(window, 'location', {
            value: { reload: jest.fn() },
            writable: true,
        });
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        localStorage.clear();
    });

    test('renders title and buttons', () => {
        render(<LyricalMatchPage user={user} />);
        expect(screen.getByText(/Find Your Lyrical Soulmate/i)).toBeInTheDocument();
        expect(screen.getByText(/Show Soulmate/i)).toBeInTheDocument();
        expect(screen.getByText(/Show Enemy/i)).toBeInTheDocument();
    });

    test('fetches and displays soulmate and enemy', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes(`/favorites/${user}`)) return Promise.resolve({ data: userFavorites });
            return Promise.resolve({ data: mockOthers });
        });

        await act(async () => {
            render(<LyricalMatchPage user={user} />);
        });

        fireEvent.click(screen.getByText(/Show Soulmate/i));
        expect(await screen.findByText(/🎵 Your Lyrical Soulmate/)).toBeInTheDocument();

        fireEvent.click(screen.getByText(/Show Enemy/i));
        expect(await screen.findByText(/🖤 Your Lyrical Enemy/)).toBeInTheDocument();
    });

    test('mutual soulmate triggers celebration overlay', async () => {
        const mutual = {
            alice: {
                favorites: userFavorites,
                wordMap: { love: 1, joy: 1, peace: 1 }
            }
        };

        axios.get.mockImplementation((url) => {
            if (url.includes(`/favorites/${user}`)) return Promise.resolve({ data: userFavorites });
            return Promise.resolve({ data: mutual });
        });

        await act(async () => {
            render(<LyricalMatchPage user={user} />);
        });

        fireEvent.click(screen.getByText(/Show Soulmate/i));

        expect(await screen.findByText(/🎉 You're each other's lyrical soulmate!/)).toBeInTheDocument();

        act(() => {
            jest.advanceTimersByTime(4000);
        });

        await waitFor(() => {
            expect(screen.getByText(/🎉 You're each other's lyrical soulmate!/)).toHaveStyle("opacity: 0");
        });
    });

    test('mutual enemy triggers sinister overlay', async () => {
        const enemyOnly = {
            bob: {
                favorites: [{ songId: '3', title: 'Angry Anthem', artistName: 'B', lyrics: 'hate fear' }],
                wordMap: { hate: 1, fear: 1 }
            }
        };

        axios.get.mockImplementation((url) => {
            if (url.includes(`/favorites/${user}`)) return Promise.resolve({ data: userFavorites });
            return Promise.resolve({ data: enemyOnly });
        });

        await act(async () => {
            render(<LyricalMatchPage user={user} />);
        });

        fireEvent.click(screen.getByText(/Show Enemy/i));

        expect(await screen.findByTestId("sinister-overlay")).toBeInTheDocument();

        act(() => {
            jest.advanceTimersByTime(4000);
        });

        await waitFor(() => {
            expect(screen.getByTestId("sinister-overlay")).toHaveStyle("opacity: 0");
        });
    });

    test('handles API error gracefully', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        axios.get.mockRejectedValue(new Error('API error'));

        await act(async () => {
            render(<LyricalMatchPage user={user} />);
        });

        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('❌ Failed to fetch lyrical match data:'), expect.any(Error));
        errorSpy.mockRestore();
    });

    test('logs out after 60s of inactivity', async () => {
        axios.get.mockResolvedValueOnce({ data: userFavorites });
        axios.get.mockResolvedValueOnce({ data: mockOthers });

        render(<LyricalMatchPage user={user} />);
        act(() => {
            jest.advanceTimersByTime(61000);
        });

        await waitFor(() => {
            expect(window.location.reload).toHaveBeenCalled();
        });
    });

    test('does nothing if user is not provided', () => {
        const spy = jest.spyOn(axios, 'get');
        render(<LyricalMatchPage user={null} />);
        expect(screen.getByText(/Find Your Lyrical Soulmate/i)).toBeInTheDocument();
        expect(spy).not.toHaveBeenCalled();
    });

    test("does nothing when there are no other users to compare (scored.length === 0)", async () => {
        const mockUser = "testuser";
        const testUserFavorites = [
            { lyrics: "dream high love", title: "Dream Song", artistName: "Sky", songId: "10" }
        ];

        const mockOnlySelf = {
            [mockUser]: {
                favorites: testUserFavorites,
                wordMap: { dream: 1, high: 1, love: 1 }
            }
        };

        axios.get.mockImplementation((url) => {
            if (url.includes(`/favorites/${mockUser}`)) {
                return Promise.resolve({ data: testUserFavorites });
            }
            if (url.includes(`/favorites/all-wordmaps`)) {
                return Promise.resolve({ data: mockOnlySelf });
            }
            return Promise.reject(new Error("Unexpected URL"));
        });

        render(<LyricalMatchPage user={mockUser} />);

        // Wait for any potential UI updates
        await waitFor(() => {
            expect(screen.queryByText(/🎵 Your Lyrical Soulmate/)).not.toBeInTheDocument();
            expect(screen.queryByText(/🖤 Your Lyrical Enemy/)).not.toBeInTheDocument();
        });
    });
    test('most similar user prefers someone else — not a mutual soulmate', async () => {
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

        // console log spy (optional, if you added one)
        const spy = jest.spyOn(console, 'log').mockImplementation(() => {});

        axios.get.mockImplementation((url) => {
            if (url.includes("/favorites/testuser")) {
                return Promise.resolve({ data: testUserFavorites });
            }
            return Promise.resolve({ data: mockOthers });
        });

        render(<LyricalMatchPage user="testuser" />);
        fireEvent.click(await screen.findByText("Show Soulmate"));

        // Should show bob as the best match
        expect(await screen.findByText(/🎵 Your Lyrical Soulmate: bob/)).toBeInTheDocument();

        // But overlay should NOT appear because bob prefers alice more
        await waitFor(() => {
            expect(screen.queryByText(/🎉 You're each other's lyrical soulmate!/)).not.toBeInTheDocument();
        });

        spy.mockRestore();
    });

    test("least similar user is not a mutual enemy because someone else is even less similar to them", async () => {
        const testUserFavorites = [
            { lyrics: "peace love unity", title: "Hope", artistName: "Zen", songId: "1" }
        ];

        const mockOthers = {
            bob: {
                favorites: [
                    { lyrics: "rage mode unity ", title: "Fight", artistName: "Chaos", songId: "2" }
                ],
                wordMap: { war: 1, fear: 1, conflict: 1 }
            },
            charlie: {
                favorites: [
                    { lyrics: "peace love unity random", title: "Lost", artistName: "Unknown", songId: "3" }
                ],
                wordMap: { random: 1, nonsense: 1, void: 1 }
            }
        };

        axios.get.mockImplementation((url) => {
            if (url.includes("/favorites/testuser")) {
                return Promise.resolve({ data: testUserFavorites });
            }
            return Promise.resolve({ data: mockOthers });
        });

        render(<LyricalMatchPage user="testuser" />);
        fireEvent.click(await screen.findByText("Show Enemy"));

        // charlie should be the lyrical enemy
        expect(await screen.findByText(/🖤 Your Lyrical Enemy: charlie/)).toBeInTheDocument();

        // Since charlie is not mutually least similar → overlay should NOT show
        await waitFor(() => {
            const overlay = screen.queryByTestId("sinister-overlay");
            expect(overlay).not.toBeInTheDocument();
        });
    });
    test("shows celebration overlay when mutual soulmate is true", async () => {
        const userFavorites = [
            { songId: "1", title: "Love Song", artistName: "Sky", lyrics: "hope peace love" }
        ];

        const mutualUser = {
            favorites: [{ songId: "2", title: "Harmony", artistName: "Bright", lyrics: "hope peace love" }],
            wordMap: { hope: 1, peace: 1, love: 1 }
        };

        axios.get.mockImplementation((url) => {
            if (url.includes("/favorites/testuser")) {
                return Promise.resolve({ data: userFavorites });
            }
            if (url.includes("/favorites/all-wordmaps")) {
                return Promise.resolve({ data: { bob: mutualUser } });
            }
            return Promise.reject(new Error("Unexpected URL"));
        });

        await act(async () => {
            render(<LyricalMatchPage user="testuser" />);
        });

        fireEvent.click(await screen.findByText("Show Soulmate"));

        expect(await screen.findByText(/🎉 You're each other's lyrical soulmate!/)).toBeInTheDocument();

        act(() => {
            jest.advanceTimersByTime(4000);
        });

        await waitFor(() => {
            expect(screen.getByText(/🎉 You're each other's lyrical soulmate!/)).toHaveStyle("opacity: 0");
        });
    });
});
