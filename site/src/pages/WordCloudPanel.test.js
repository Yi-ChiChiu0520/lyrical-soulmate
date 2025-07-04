import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import axios from 'axios';
import WordCloudPanel from './WordCloudPanel';
import { act } from 'react-dom/test-utils';
import userEvent from "@testing-library/user-event";
jest.mock('axios');

const mockUser = 'testUser';
const mockSongs = [
    {
        songId: '1',
        title: 'Test Song 1',
        url: 'http://test.com/1',
        imageUrl: 'http://test.com/img1.jpg',
        releaseDate: '2023-01-01',
        artistName: 'Test Artist 1'
    }
];

const mockLyrics = {
    data: {
        lyrics: 'sunshine happiness rainbow'
    }
};

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {}); // mute console.error
    axios.get.mockResolvedValue(mockLyrics);
});

// 🔥 Helper to tolerate stemming (partial match)
async function findWordContaining(partialText) {
    return await screen.findByText((content) => content.toLowerCase().includes(partialText.toLowerCase()));
}

test('displays loading spinner if loading prop is true', async () => {
    render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} loading={true} isGeneratingEnabled={true} />);
    await waitFor(() => {
        expect(screen.getByText(/generating word cloud/i)).toBeInTheDocument();
    });
});

test('renders word cloud from one song and responds to word click', async () => {
    render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} loading={true} isGeneratingEnabled={true} />);
    const word = await findWordContaining('sun');
    expect(word).toBeInTheDocument();

    fireEvent.click(word);
    expect(await screen.findByText(/songs containing/i)).toBeInTheDocument();
    expect(screen.getByText('Test Song 1')).toBeInTheDocument();
});

test('toggles between cloud and table view', async () => {
    render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} loading={true} isGeneratingEnabled={true} />);

    await findWordContaining('sun'); // wait until some word appears

    fireEvent.click(screen.getByRole('button', { name: /table/i }));

    expect(screen.getByText('Word')).toBeInTheDocument();
    expect(screen.getByText('Count')).toBeInTheDocument();

    // ⬇ corrected click
    fireEvent.click(document.getElementById('view-cloud'));

    expect(screen.queryByText('Word')).not.toBeInTheDocument();
});


test('adds song to favorites successfully', async () => {
    axios.post.mockResolvedValue({});
    render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} loading={true} isGeneratingEnabled={true} />);

    const word = await findWordContaining('sun');
    fireEvent.click(word);

    const songDiv = screen.getByText('Test Song 1').closest('div');
    fireEvent.mouseEnter(songDiv);

    await act(async () => {
        fireEvent.click(screen.getByText(/add to favorites/i));
    });

    await waitFor(() => {
        expect(screen.getByText(/✅ Added Test Song 1 to favorites/i)).toBeInTheDocument();
    });
});

test('removes a song from word cloud and regenerates it', async () => {
    const twoSongs = [
        { ...mockSongs[0] },
        {
            songId: '2',
            title: 'Second Song',
            url: 'http://test.com/2',
            imageUrl: 'http://test.com/img2.jpg',
            releaseDate: '2023-02-01',
            artistName: 'Artist 2'
        }
    ];
    render(<WordCloudPanel user={mockUser} wordCloudSongs={twoSongs} loading={true} isGeneratingEnabled={true} />);

    expect(await screen.findByText(/Test Song 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Second Song/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByText('Remove')[0]);

    await waitFor(() => {
        expect(screen.queryByText(/Test Song 1/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Second Song/i)).toBeInTheDocument();
    });
});

test('shows error if adding to favorites fails', async () => {
    axios.post.mockRejectedValue(new Error("Already exists"));
    render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} loading={true} isGeneratingEnabled={true} />);

    const word = await findWordContaining('sun');
    fireEvent.click(word);

    const songDiv = screen.getByText('Test Song 1').closest('div');
    fireEvent.mouseEnter(songDiv);
    fireEvent.click(screen.getByText(/add to favorites/i));

    await waitFor(() => {
        expect(screen.getByText(/❌ Could not add Test Song 1/i)).toBeInTheDocument();
    });
});

test('handles failed lyrics fetch and logs error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    axios.get.mockRejectedValueOnce(new Error('Lyrics fetch failed'));

    render(<WordCloudPanel user={mockUser} wordCloudSongs={[{ ...mockSongs[0], songId: 'broken-123' }]} loading={false} isGeneratingEnabled={true} />);

    await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch lyrics:', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
});

test('shows Add to Favorites button on hover and hides on mouse leave', async () => {
    render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} loading={true} isGeneratingEnabled={true} />);
    const word = await findWordContaining('sun');
    fireEvent.click(word);

    const songDiv = screen.getByText('Test Song 1').closest('div');

    const addToFavoritesButton = await screen.findByText(/Add to Favorites/i);
    expect(addToFavoritesButton.parentElement).toHaveClass('opacity-0');

    // Hover the song div
    fireEvent.mouseEnter(songDiv);

    // Now it should have opacity-100 (visible)
    await waitFor(() => {
        expect(addToFavoritesButton.parentElement).toHaveClass('opacity-100');
    });

    // Mouse leave again
    fireEvent.mouseLeave(songDiv);

    // It should go back to opacity-0 (hidden)
    await waitFor(() => {
        expect(addToFavoritesButton.parentElement).toHaveClass('opacity-0');
    });
});

test('clicking a relevant song from word cloud shows lyrics', async () => {
    render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} loading={true} isGeneratingEnabled={true} />);
    const word = await findWordContaining('sun');
    fireEvent.click(word);

    const songDiv = screen.getByText('Test Song 1');
    fireEvent.click(songDiv);

    const lyricsLabel = await screen.findByText(/♫ Lyrics:/i);
    const lyricsContainer = lyricsLabel.parentElement;
    await waitFor(() => {
        expect(within(lyricsContainer).getByText(/sunshine/i)).toBeInTheDocument();
        expect(within(lyricsContainer).getByText(/happiness/i)).toBeInTheDocument();
    });

    fireEvent.click(songDiv); // collapse
});

test('clicking a word in table view shows related songs', async () => {
    render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} loading={true} isGeneratingEnabled={true} />);

    await findWordContaining('rainbow');

    fireEvent.click(screen.getByRole('button', { name: /table/i }));

    const tableRow = await screen.findByText((text) => text.toLowerCase().includes('sunshin'));
    fireEvent.click(tableRow.closest('tr'));

    await screen.findByText(/songs containing/i);
    expect(screen.getByText('Test Song 1')).toBeInTheDocument();
});


test('shows correct status message based on isGeneratingEnabled', async () => {
    render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} isGeneratingEnabled={false} />);
    expect(await screen.findByText(/❌ Please start the word cloud before generating/i)).toBeInTheDocument();

    render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} isGeneratingEnabled={true} />);
    expect(await screen.findByText(/✅ Word Cloud started/i)).toBeInTheDocument();
});

test('clears word cloud when incomingSongs is empty or invalid', () => {
    const testCases = [
        { description: 'empty array', input: [] },
        { description: 'null', input: null },
        { description: 'undefined', input: undefined }
    ];

    testCases.forEach(({ description, input }) => {
        const { container } = render(<WordCloudPanel user={mockUser} wordCloudSongs={input} loading={false} isGeneratingEnabled={true} />);
        const panel = container.firstChild;
        expect(within(panel).getByText(/0 songs/i)).toBeInTheDocument();
    });
});

test('clicking Stop Word Cloud clears state and shows stop message', async () => {
    render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} isGeneratingEnabled={true} />);
    fireEvent.click(screen.getByRole('button', { name: /stop word cloud/i }));

    await waitFor(() => {
        expect(screen.getByText(/❌ Please start the word cloud/i)).toBeInTheDocument();
    });

    expect(screen.queryByText('Test Song 1')).not.toBeInTheDocument();
});

test('treats missing lyrics as empty string without crashing', async () => {
    axios.get.mockResolvedValueOnce({ data: { lyrics: undefined } });
    render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} isGeneratingEnabled={true} />);

    await waitFor(() => {
        expect(screen.queryByText(/sunshine/i)).not.toBeInTheDocument();
    });
});

test('stopping word cloud clears wordCloudSongs and shows 0 songs', async () => {
    render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} loading={true} isGeneratingEnabled={true} />);
    expect(await findWordContaining('sun')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /stop word cloud/i }));

    await waitFor(() => {
        expect(screen.queryByText('Test Song 1')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/0 songs/i)).toBeInTheDocument();
});

describe('panel is keyboard navigable',() => {
    const testView = async (view) => {
        const user = userEvent.setup();

        const tabUntil = async (label) => {
            let focused = document.activeElement;
            let maxTabs = 20;
            while (maxTabs > 0) {
                if (focused.hasAttribute('aria-label') && focused.getAttribute('aria-label').includes(label)) {
                    break;
                }
                await user.tab();
                focused = document.activeElement;
                maxTabs--;
            }
        }

        if (view === 'table') {
            fireEvent.click(screen.getByRole('button', { name: /switch view to table/i }));
        }

        await tabUntil('WordCloud Word:')
        // Press Enter to select the word
        await user.keyboard("[Enter]");

        // It should open related songs now
        expect(await screen.findByText(/songs containing/i)).toBeInTheDocument();

        // Tab to the first song
        await tabUntil('Related Song:');

        const firstSongTitle = screen.getAllByRole("button", { name: /Related Song: Test Song 1/i })[0];
        expect(firstSongTitle).toHaveFocus();

        // Press Enter to expand song details
        await user.keyboard("[Enter]");
        expect(await screen.findByText(/Artist 1/)).toBeInTheDocument();

        // Press Enter again to collapse
        await user.keyboard("[Enter]");
        expect(screen.queryByText(/Artist 1/)).not.toBeInTheDocument();

        // Tab to the "Add to Favorites" button
        await user.tab();
        const addToFavoritesButtons = screen.getAllByRole("button", { name: /Add to Favorites/i }).filter((button)=>button.parentElement?.classList.contains('opacity-100'));
        const addToFavoritesButton = addToFavoritesButtons[0];

        expect(addToFavoritesButton).toHaveFocus();

        // Press Enter to "Add to Favorites"
        await user.keyboard("[Enter]");

        expect(await screen.findByText(/Added Test Song 1 to favorites/i)).toBeInTheDocument();

        await tabUntil('Related Song:');
    }

    it("cloud view allows tabbing through clickable elements and expands/collapses sections on Enter", async () => {
        const twoSongs = [
            { ...mockSongs[0] },
            {
                songId: '2',
                title: 'Second Song',
                url: 'http://test.com/2',
                imageUrl: 'http://test.com/img2.jpg',
                releaseDate: '2023-02-01',
                artistName: 'Artist 2'
            }
        ];
        render(
            <WordCloudPanel
                user="testuser"
                wordCloudSongs={twoSongs}
                loading={false}
                isGeneratingEnabled={true}
            />
        );

        await findWordContaining('sun');
        await testView('cloud');
    });

    it("table view allows tabbing through clickable elements and expands/collapses sections on Enter", async () => {
        const twoSongs = [
            { ...mockSongs[0] },
            {
                songId: '2',
                title: 'Second Song',
                url: 'http://test.com/2',
                imageUrl: 'http://test.com/img2.jpg',
                releaseDate: '2023-02-01',
                artistName: 'Artist 2'
            }
        ];
        render(
            <WordCloudPanel
                user="testuser"
                wordCloudSongs={twoSongs}
                isGeneratingEnabled={true}
            />
        );

        await findWordContaining('sun');
        await testView('table');
    });


})
