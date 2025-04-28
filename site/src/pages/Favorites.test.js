import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Favorites from './Favorites';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';

// Mock axios
jest.mock('axios');

// Mock navigate
const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockedNavigate,
    Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />
}));

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
const mockFavorites = [
    {
        songId: '1',
        title: 'Test Song 1',
        artistName: 'Test Artist 1',
        releaseDate: '2023-01-01',
        imageUrl: 'test-image-1.jpg',
        rank: 1
    },
    {
        songId: '2',
        title: 'Test Song 2',
        artistName: 'Test Artist 2',
        releaseDate: '2023-01-02',
        imageUrl: 'test-image-2.jpg',
        rank: 2
    }
];

describe('Favorites Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        jest.spyOn(console, 'error').mockImplementation(() => {}); // mute console.error

        // Default axios responses
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/favorites/privacy/')) {
                return Promise.resolve({ data: false }); // Default to public
            } else if (url.includes('/api/favorites/')) {
                return Promise.resolve({ data: mockFavorites });
            }
            return Promise.reject(new Error('Not found'));
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('redirects to home when user is not provided', async () => {
        await act(async () => {
            render(
                <BrowserRouter>
                    <Favorites user={null}/>
                </BrowserRouter>
            );
        });

        expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/');
    });

    test('renders the favorites list when user is provided', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/favorites/privacy/')) {
                return Promise.resolve({ data: false });
            } else if (url.includes('/api/favorites/')) {
                return Promise.resolve({ data: mockFavorites });
            }
            return Promise.reject(new Error('Not found'));
        });

        await act(async () => {
            render(
                <BrowserRouter>
                    <Favorites user={mockUser} />
                </BrowserRouter>
            );
        });


        await waitFor(() => {
            expect(screen.getByText(`💖 ${mockUser}'s Favorite Songs`)).toBeInTheDocument();
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
            expect(screen.getByText('Test Song 2')).toBeInTheDocument();
        });
    });

    test('displays no favorites message when list is empty', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/favorites/privacy/')) {
                return Promise.resolve({ data: false });
            } else if (url.includes('/api/favorites/')) {
                return Promise.resolve({ data: [] });
            }
            return Promise.reject(new Error('Not found'));
        });

        await act(async () => {
            render(
                <BrowserRouter>
                    <Favorites user={mockUser} />
                </BrowserRouter>
            );
        });


        await waitFor(() => {
            expect(screen.getByText('No favorite songs yet.')).toBeInTheDocument();
        });
    });

    test('expands song details when clicking on a song title', async () => {
        await act(async () => {
            render(
                <BrowserRouter>
                    <Favorites user={mockUser} />
                </BrowserRouter>
            );
        });


        await waitFor(() => {
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Test Song 1'));

        await waitFor(() => {
            expect(screen.getByText('🎤 Artist:')).toBeInTheDocument();
            expect(screen.getByText('Test Artist 1')).toBeInTheDocument();
            expect(screen.getByText('📅 Release Date:')).toBeInTheDocument();
            expect(screen.getByText('2023-01-01')).toBeInTheDocument();
        });

        // Click again to collapse
        fireEvent.click(screen.getByText('Test Song 1'));

        await waitFor(() => {
            expect(screen.queryByText('🎤 Artist:')).not.toBeInTheDocument();
        });
    });

    test('shows removal confirmation when clicking remove button', async () => {
        await act(async () => {
            render(
                <BrowserRouter>
                    <Favorites user={mockUser} />
                </BrowserRouter>
            );
        });


        await waitFor(() => {
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
        });

        // Hover over song to show buttons
        fireEvent.mouseEnter(screen.getByText('Test Song 1').closest('li'));

        // Click remove button
        const removeButtons = await screen.findAllByLabelText('Remove');
        fireEvent.click(removeButtons[0]);

        // Modal should appear
        expect(screen.getByText('Confirm Removal')).toBeInTheDocument();
        expect(screen.getByText('Are you sure you want to remove Test Song 1 from your favorites?')).toBeInTheDocument();
    });

    test('removes song when confirming removal', async () => {
        axios.delete.mockResolvedValue({});

        await act(async () => {
    render(
        <BrowserRouter>
            <Favorites user={mockUser} />
        </BrowserRouter>
    );
});


        await waitFor(() => {
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
        });

        // Hover over song to show buttons
        fireEvent.mouseEnter(screen.getByText('Test Song 1').closest('li'));

        // Click remove button
        const removeButtons = await screen.findAllByLabelText('Remove');
        fireEvent.click(removeButtons[0]);

        // Click confirm button
        fireEvent.click(screen.getByText('Yes, remove song'));

        // Check if API was called
        expect(axios.delete).toHaveBeenCalledWith(
            `http://localhost:8080/api/favorites/remove/${mockUser}/1`
        );

        // Check if message is displayed
        await waitFor(() => {
            expect(screen.getByText('❌ Song removed from favorites.')).toBeInTheDocument();
        });
    });

    test('cancels removal when clicking cancel button', async () => {
        await act(async () => {
    render(
        <BrowserRouter>
            <Favorites user={mockUser} />
        </BrowserRouter>
    );
});


        await waitFor(() => {
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
        });

        // Hover over song to show buttons
        fireEvent.mouseEnter(screen.getByText('Test Song 1').closest('li'));

        // Click remove button
        const removeButtons = await screen.findAllByLabelText('Remove');
        fireEvent.click(removeButtons[0]);

        // Click cancel button
        fireEvent.click(screen.getByText('No'));

        // Modal should disappear
        expect(screen.queryByText('Confirm Removal')).not.toBeInTheDocument();

        // Check that delete API wasn't called
        expect(axios.delete).not.toHaveBeenCalled();
    });

    test('clears all favorites when clicking clear all button', async () => {
        axios.delete.mockResolvedValue({});

        await act(async () => {
        render(
            <BrowserRouter>
                <Favorites user={mockUser} />
            </BrowserRouter>
            );
        });


        await waitFor(() => {
            expect(screen.getByText('🧹 Clear All Favorites')).toBeInTheDocument();
        });

        // fire click on clear all button
        fireEvent.click(screen.getByText('🧹 Clear All Favorites'));

        // accept on the modal
        fireEvent.click(screen.getByText('Yes, clear all'));

        // Check if API was called for each song
        await waitFor(() => {
            expect(axios.delete).toHaveBeenCalledTimes(2);
            expect(axios.delete).toHaveBeenCalledWith(
                `http://localhost:8080/api/favorites/remove/${mockUser}/1`
            );
            expect(axios.delete).toHaveBeenCalledWith(
                `http://localhost:8080/api/favorites/remove/${mockUser}/2`
            );
        });

        // Check if message is displayed
        await waitFor(() => {
            expect(screen.getByText('🧹 All songs cleared from favorites.')).toBeInTheDocument();
        });
    });

    test('doesnt clear all favorites when clicking decline clear all button', async () => {
        axios.delete.mockResolvedValue({});

        await act(async () => {
            render(
                <BrowserRouter>
                    <Favorites user={mockUser} />
                </BrowserRouter>
            );
        });


        await waitFor(() => {
            expect(screen.getByText('🧹 Clear All Favorites')).toBeInTheDocument();
        });

        // fire click on clear all button
        fireEvent.click(screen.getByText('🧹 Clear All Favorites'));

        // accept on the modal
        fireEvent.click(screen.getByText('No'));

        // Check if API was called for each song
        await waitFor(() => {
            expect(axios.delete).toHaveBeenCalledTimes(0);
        });
    });

    test('moves a favorite up', async () => {
        await act(async () => {
    render(
        <BrowserRouter>
            <Favorites user={mockUser} />
        </BrowserRouter>
        );
    });


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
        await act(async () => {
    render(
        <BrowserRouter>
            <Favorites user={mockUser} />
        </BrowserRouter>
    );
});


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


    it("toggles from Private to Public when clicking the switch", async () => {
        // 1) initial GET → privacy = true  (starts Private)
        // 2) initial GET → favorites list []
        // 3) POST toggle → resolves
        // 4) final GET → privacy = false (becomes Public)
        axios.get
            .mockResolvedValueOnce({ data: true })         // initial privacy
            .mockResolvedValueOnce({ data: mockFavorites })// fetchFavorites()
            .mockResolvedValueOnce({ data: false });       // after toggle
        axios.post.mockResolvedValueOnce({});             // toggle succeeds

        await act(async () => {
    render(
        <BrowserRouter>
            <Favorites user={mockUser} />
        </BrowserRouter>
    );
});


        // wait for the "Private" label
        await waitFor(() => {
            expect(screen.getByText("Private")).toBeInTheDocument();
        });

        // click the toggle DIV next to the lock‐icon label
        const lockLabel = screen.getByText("🔒 Favorites Privacy:");
        const toggleDiv = lockLabel.nextSibling;
        fireEvent.click(toggleDiv);

        // ensure we POSTed with isPrivate=false
        expect(axios.post).toHaveBeenCalledWith(
            `http://localhost:8080/api/favorites/privacy/${mockUser}?isPrivate=false`
        );

        // afterwards, we should see "Public"
        await waitFor(() => {
            expect(screen.getByText("Public")).toBeInTheDocument();
        });

        // and the corresponding banner
        expect(screen.getByText("Favorites are now Public 🌐")).toBeInTheDocument();
    });
    test("toggles privacy setting when clicking toggle switch (success path)", async () => {
        // 1️⃣ initial GET → privacy = false (Public)
        // 2️⃣ initial GET → favorites list
        // 3️⃣ POST toggle → succeed
        // 4️⃣ final GET → privacy = true (Private)
        axios.get
            .mockResolvedValueOnce({ data: false })
            .mockResolvedValueOnce({ data: mockFavorites })
            .mockResolvedValueOnce({ data: true });
        axios.post.mockResolvedValueOnce({});

        await act(async () => {
    render(
        <BrowserRouter>
            <Favorites user={mockUser} />
        </BrowserRouter>
    );
});

        // wait for “Public” label
        await waitFor(() => expect(screen.getByText("Public")).toBeInTheDocument());

        // click the toggle `<div>`
        const toggleDiv = screen.getByText("Public").previousSibling;
        fireEvent.click(toggleDiv);

        // axios.post should have been called with isPrivate=true
        expect(axios.post).toHaveBeenCalledWith(
            `http://localhost:8080/api/favorites/privacy/${mockUser}?isPrivate=true`
        );

        // after toggle, “Private” label and success banner appear
        await waitFor(() => expect(screen.getByText("Private")).toBeInTheDocument());
        expect(screen.getByText("Favorites are now Private 🔒")).toBeInTheDocument();
    });



    test("shows error banner when toggle fails (failure path)", async () => {
        // 1️⃣ initial GET → privacy = false
        // 2️⃣ initial GET → favorites list
        // 3️⃣ POST toggle → fail
        axios.get
            .mockResolvedValueOnce({ data: false })
            .mockResolvedValueOnce({ data: mockFavorites });
        axios.post.mockRejectedValueOnce(new Error("network error"));

        await act(async () => {
    render(
        <BrowserRouter>
            <Favorites user={mockUser} />
        </BrowserRouter>
    );
});

        await waitFor(() => expect(screen.getByText("Public")).toBeInTheDocument());

        const toggleDiv = screen.getByText("Public").previousSibling;
        fireEvent.click(toggleDiv);

        // error banner appears
        await waitFor(() =>
            expect(screen.getByText("⚠️ Failed to update privacy.")).toBeInTheDocument()
        );
    });

    test('handles errors when fetching favorites', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/favorites/privacy/')) {
                return Promise.resolve({ data: false });
            } else if (url.includes('/api/favorites/')) {
                return Promise.reject(new Error('API Error'));
            }
            return Promise.reject(new Error('Not found'));
        });

        await act(async () => {
    render(
        <BrowserRouter>
            <Favorites user={mockUser} />
        </BrowserRouter>
    );
});


        await waitFor(() => {
            expect(screen.getByText('No favorite songs yet.')).toBeInTheDocument();
        });
    });

    test('handles errors when fetching privacy setting', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/favorites/privacy/')) {
                return Promise.reject(new Error('API Error'));
            } else if (url.includes('/api/favorites/')) {
                return Promise.resolve({ data: mockFavorites });
            }
            return Promise.reject(new Error('Not found'));
        });

        await act(async () => {
    render(
        <BrowserRouter>
            <Favorites user={mockUser} />
        </BrowserRouter>
    );
});


        await waitFor(() => {
            expect(screen.getByText('⚠️ Could not load privacy settings.')).toBeInTheDocument();
        });
    });

    test('handles errors when updating privacy setting', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/favorites/privacy/')) {
                return Promise.resolve({ data: false });
            } else if (url.includes('/api/favorites/')) {
                return Promise.resolve({ data: mockFavorites });
            }
            return Promise.reject(new Error('Not found'));
        });

        axios.post.mockRejectedValue(new Error('API Error'));

        await act(async () => {
    render(
        <BrowserRouter>
            <Favorites user={mockUser} />
        </BrowserRouter>
    );
});


        await waitFor(() => {
            expect(screen.getByText('Public')).toBeInTheDocument();
        });

        // Click toggle switch
        fireEvent.click(screen.getByText('Public').previousSibling);

        // Check if error message is displayed
        await waitFor(() => {
            expect(screen.getByText('⚠️ Failed to update privacy.')).toBeInTheDocument();
        });
    });

    test('handles errors when removing a song', async () => {
        axios.delete.mockRejectedValue(new Error('API Error'));

        await act(async () => {
    render(
        <BrowserRouter>
            <Favorites user={mockUser} />
        </BrowserRouter>
    );
});


        await waitFor(() => {
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
        });

        // Hover over song to show buttons
        fireEvent.mouseEnter(screen.getByText('Test Song 1').closest('li'));

        // Click remove button
        const removeButtons = await screen.findAllByLabelText('Remove');
        fireEvent.click(removeButtons[0]);

        // Click confirm button
        fireEvent.click(screen.getByText('Yes, remove song'));

        // Check if error message is displayed
        await waitFor(() => {
            expect(screen.getByText('⚠️ Failed to remove song.')).toBeInTheDocument();
        });
    });

    test('handles errors when clearing all favorites', async () => {
        axios.delete.mockRejectedValue(new Error('API Error'));

        await act(async () => {
    render(
        <BrowserRouter>
            <Favorites user={mockUser} />
        </BrowserRouter>
    );
});


        await waitFor(() => {
            expect(screen.getByText('🧹 Clear All Favorites')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('🧹 Clear All Favorites'))
        fireEvent.click(screen.getByText('Yes, clear all'));

        // Check if error message is displayed
        await waitFor(() => {
            expect(screen.getByText('⚠️ Failed to clear favorites.')).toBeInTheDocument();
        });
    });

    test('handles errors when moving a song', async () => {
        axios.post.mockRejectedValue(new Error('API Error'));

        await act(async () => {
    render(
        <BrowserRouter>
            <Favorites user={mockUser} />
        </BrowserRouter>
    );
});


        await waitFor(() => {
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
        });

        // Hover over the first song to show buttons
        fireEvent.mouseEnter(screen.getByText('Test Song 1').closest('li'));

        // Click move down button
        const moveDownButtons = await screen.findAllByLabelText('Move down');
        fireEvent.click(moveDownButtons[0]);

        // Check if error message is displayed
        await waitFor(() => {
            expect(screen.getByText('⚠️ Failed to reorder favorites.')).toBeInTheDocument();
        });
    });

    test('logs out user after inactivity period', async () => {
        Object.defineProperty(window, 'location', {
            value: { reload: jest.fn() }
        });

        await act(async () => {
    render(
        <BrowserRouter>
            <Favorites user={mockUser} />
        </BrowserRouter>
    );
});


        await waitFor(() => {
            expect(screen.getByText(`💖 ${mockUser}'s Favorite Songs`)).toBeInTheDocument();
        });

        // Fast-forward time by more than the inactivity timeout (60000ms)
        act(() => {
            jest.advanceTimersByTime(65000);
        });

        // Check if localStorage was cleared
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
        expect(window.location.reload).toHaveBeenCalled();
    });

    test('resets inactivity timer on user interaction', async () => {
        Object.defineProperty(window, 'location', {
            value: { reload: jest.fn() }
        });

        await act(async () => {
    render(
        <BrowserRouter>
            <Favorites user={mockUser} />
        </BrowserRouter>
    );
});


        await waitFor(() => {
            expect(screen.getByText(`💖 ${mockUser}'s Favorite Songs`)).toBeInTheDocument();
        });

        // Fast-forward time by less than the timeout
        act(() => {
            jest.advanceTimersByTime(50000);
        });

        // Simulate user interaction
        fireEvent.click(screen.getByText(`💖 ${mockUser}'s Favorite Songs`));

        // Fast-forward time again, but not enough to trigger logout
        act(() => {
            jest.advanceTimersByTime(50000);
        });

        // Check that logout wasn't called
        expect(localStorageMock.removeItem).not.toHaveBeenCalled();
        expect(window.location.reload).not.toHaveBeenCalled();

        // Now advance time enough to trigger logout
        act(() => {
            jest.advanceTimersByTime(15000);
        });

        // Now logout should be called
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
        expect(window.location.reload).toHaveBeenCalled();
    });

    test('filters out invalid songs from favorites data', async () => {
        const invalidFavorites = [
            {
                songId: '1',
                title: 'Test Song 1',
                artistName: 'Test Artist 1',
                imageUrl: 'test-image-1.jpg',
            },
            null,
            {},
            { title: 'Invalid Song' } // Missing songId
        ];

        axios.get.mockImplementation((url) => {
            if (url.includes('/api/favorites/privacy/')) {
                return Promise.resolve({ data: false });
            } else if (url.includes('/api/favorites/')) {
                return Promise.resolve({ data: invalidFavorites });
            }
            return Promise.reject(new Error('Not found'));
        });

        await act(async () => {
    render(
        <BrowserRouter>
            <Favorites user={mockUser} />
        </BrowserRouter>
    );
});


        await waitFor(() => {
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
            // The invalid entries should be filtered out
            expect(screen.queryByText('Invalid Song')).not.toBeInTheDocument();
        });
    });

    test('does not allow invalid moves (beyond array bounds)', async () => {
        await act(async () => {
    render(
        <BrowserRouter>
            <Favorites user={mockUser} />
        </BrowserRouter>
    );
});


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
    it("shows action buttons on hover and hides them on mouse leave", async () => {
        const mockUser = "testUser";
        const mockSongs = [
            {
                songId: "1",
                title: "HoverSong",
                artistName: "Artist",
                releaseDate: "2023-01-01",
                imageUrl: "img.jpg",
                rank: 1,
            },
        ];

        // 1) privacy check  2) fetchFavorites
        axios.get
            .mockResolvedValueOnce({ data: false })
            .mockResolvedValueOnce({ data: mockSongs });

        await act(async () => {
            render(
                <BrowserRouter>
                    <Favorites user={mockUser} />
                </BrowserRouter>
            );
        });


        // wait for our song to render
        const songTitle = await screen.findByText("HoverSong");
        const listItem = songTitle.closest("li");

        // Before hover: no action buttons
        expect(screen.queryByLabelText("Move up")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Move down")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Remove")).not.toBeInTheDocument();

        // Hover
        fireEvent.mouseEnter(listItem);
        expect(screen.getByLabelText("Move up")).toBeInTheDocument();
        expect(screen.getByLabelText("Move down")).toBeInTheDocument();
        expect(screen.getByLabelText("Remove")).toBeInTheDocument();

        // Mouse leave
        fireEvent.mouseLeave(listItem);
        await waitFor(() => {
            expect(screen.queryByLabelText("Move up")).not.toBeInTheDocument();
            expect(screen.queryByLabelText("Move down")).not.toBeInTheDocument();
            expect(screen.queryByLabelText("Remove")).not.toBeInTheDocument();
        });
    });


});