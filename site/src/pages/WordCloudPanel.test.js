import React from 'react';
import {render, screen, fireEvent, waitFor, within} from '@testing-library/react';
import axios from 'axios';
import WordCloudPanel from './WordCloudPanel';
import { act } from 'react-dom/test-utils';
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
    axios.get.mockResolvedValue(mockLyrics); // Every lyrics request gets the same fast response
});

test('displays loading spinner if loading prop is true', async () => {
    render(<WordCloudPanel
        user={mockUser}
        wordCloudSongs={mockSongs}
        loading={true}
        isGeneratingEnabled={true}
    />);

    await waitFor(() => {
        expect(screen.getByText(/generating word cloud/i)).toBeInTheDocument();
    });
});


test('renders word cloud from one song and responds to word click', async () => {
    render(<WordCloudPanel
        user={mockUser}
        wordCloudSongs={mockSongs}
        loading={true}
        isGeneratingEnabled={true}
    />);

    // wait for one of the words to appear
    const word = await screen.findByText('sunshine');
    expect(word).toBeInTheDocument();

    // click on a word and verify related songs appear
    fireEvent.click(word);
    expect(await screen.findByText(/songs containing "sunshine"/i)).toBeInTheDocument();
    expect(screen.getByText('Test Song 1')).toBeInTheDocument();
});
test('toggles between cloud and table view', async () => {
    render(<WordCloudPanel
        user={mockUser}
        wordCloudSongs={mockSongs}
        loading={true}
        isGeneratingEnabled={true}
    />);

    await screen.findByText('sunshine');

    fireEvent.click(screen.getByRole('button', { name: /table/i }));
    expect(screen.getByText('Word')).toBeInTheDocument();
    expect(screen.getByText('Count')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('view-cloud'));
    expect(screen.queryByText('Word')).not.toBeInTheDocument();
});

test('adds song to favorites successfully', async () => {
    axios.post.mockResolvedValue({});

    render(<WordCloudPanel
        user={mockUser}
        wordCloudSongs={mockSongs}
        loading={true}
        isGeneratingEnabled={true}
    />);

    const word = await screen.findByText('sunshine');
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
    axios.get.mockResolvedValue({
        data: { lyrics: 'sunshine rainbow happiness' }
    });

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

    render(<WordCloudPanel
        user={mockUser}
        wordCloudSongs={twoSongs}
        loading={true}
        isGeneratingEnabled={true}
    />);

    // Use flexible matchers to avoid emoji issues
    expect(await screen.findByText(/Test Song 1/)).toBeInTheDocument();
    expect(screen.getByText(/Second Song/)).toBeInTheDocument();

    // Remove the first song
    fireEvent.click(screen.getAllByText('Remove')[0]);

    // Verify it's gone, and the second remains
    await waitFor(() => {
        expect(screen.queryByText(/Test Song 1/)).not.toBeInTheDocument();
        expect(screen.getByText(/Second Song/)).toBeInTheDocument();
    });
});

test('shows error if adding to favorites fails', async () => {
    axios.post.mockRejectedValue(new Error("Already exists"));

    render(<WordCloudPanel
        user={mockUser}
        wordCloudSongs={mockSongs}
        loading={true}
        isGeneratingEnabled={true}
    />);

    const word = await screen.findByText('sunshine');
    fireEvent.click(word);

    const songDiv = screen.getByText('Test Song 1').closest('div');
    fireEvent.mouseEnter(songDiv);
    fireEvent.click(screen.getByText(/add to favorites/i));

    await waitFor(() => {
        expect(screen.getByText(/❌ Could not add Test Song 1/i)).toBeInTheDocument();
    });
});

test('handles failed lyrics fetch and logs error', async () => {
    const errorSong = [{
        songId: 'broken-123',
        title: 'Broken Song',
        url: 'http://test.com/broken',
        imageUrl: 'http://test.com/img.jpg',
        releaseDate: '2023-04-01',
        artistName: 'Broken Artist'
    }];

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    axios.get.mockRejectedValueOnce(new Error('Lyrics fetch failed'));

    render(<WordCloudPanel
        user={mockUser}
        wordCloudSongs={errorSong}
        loading={false} // Set to false to let the component initiate the fetch
        isGeneratingEnabled={true}
    />);

    await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Failed to fetch lyrics:',
            expect.any(Error)
        );
    });

    consoleErrorSpy.mockRestore();
});


test('shows Add to Favorites button on hover and hides on mouse leave', async () => {
    axios.get.mockResolvedValue({
        data: { lyrics: 'sunshine happiness' }
    });

    render(<WordCloudPanel
        user={mockUser}
        wordCloudSongs={mockSongs}
        loading={true}
        isGeneratingEnabled={true}
    />);

    // wait for word cloud
    await screen.findByText('sunshine');

    // click a word to trigger relatedSongs
    fireEvent.click(screen.getByText('sunshine'));

    const songDiv = screen.getByText('Test Song 1').closest('div');

    // 🔍 Hover to show the button
    fireEvent.mouseEnter(songDiv);
    expect(screen.getByText(/Add to Favorites/i)).toBeInTheDocument();

    // ❌ Unhover to hide the button
    fireEvent.mouseLeave(songDiv);
    await waitFor(() => {
        expect(screen.queryByText(/Add to Favorites/i)).not.toBeInTheDocument();
    });
});

test('clicking a relevant song from word cloud will show lyrics', async() => {
    axios.get.mockResolvedValue({
        data: { lyrics: 'sunshine happiness' }
    });

    render(<WordCloudPanel
        user={mockUser}
        wordCloudSongs={mockSongs}
        loading={true}
        isGeneratingEnabled={true}
    />);

    // wait for word cloud
    await screen.findByText('sunshine');

    // click a word to trigger relatedSongs
    fireEvent.click(screen.getByText('sunshine'));

    const songDiv = screen.getByText('Test Song 1');
    fireEvent.click(songDiv);

    const lyricsLabel = await screen.findByText(/♫ Lyrics:/i);
    const lyricsContainer = lyricsLabel.parentElement;
    await waitFor(() => {
        expect(within(lyricsContainer).getByText(/sunshine/i)).toBeInTheDocument();
        expect(within(lyricsContainer).getByText(/happiness/i)).toBeInTheDocument();
    });

    fireEvent.click(songDiv);
})

test('clicking a word in table view shows related songs', async () => {
    axios.get.mockResolvedValue({
        data: { lyrics: 'rainbow sunshine happiness' }
    });

    render(<WordCloudPanel
        user={mockUser}
        wordCloudSongs={mockSongs}
        loading={true}
        isGeneratingEnabled={true}
    />);

    // Switch to table view
    await screen.findByText('rainbow'); // wait for initial render
    fireEvent.click(screen.getByRole('button', { name: /table/i }));

    // Find the table row containing "sunshine"
    const tableRow = screen.getByText('sunshine').closest('tr');
    fireEvent.click(tableRow);

    // Confirm related song section shows up
    await screen.findByText(/songs containing "sunshine"/i);
    expect(screen.getByText('Test Song 1')).toBeInTheDocument();
});

test('shows correct status message based on isGeneratingEnabled', async () => {
    // Case 1: when isGeneratingEnabled is false
    render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} isGeneratingEnabled={false} />);
    expect(await screen.findByText(/❌ Please start the word cloud before generating/i)).toBeInTheDocument();

    // Case 2: when isGeneratingEnabled is true
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
        const { container } = render(<WordCloudPanel
            user={mockUser}
            wordCloudSongs={input}
            loading={false}
            isGeneratingEnabled={true}
        />);

        // Find the song count within the main panel only
        const panel = container.firstChild;
        const songCount = within(panel).getByText(/0 songs/i);

        expect(songCount).toBeInTheDocument();
        expect(screen.queryByText(/sunshine/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
});
test('clicking Stop Word Cloud clears state and shows stop message', async () => {
    render(
        <WordCloudPanel
            user={mockUser}
            wordCloudSongs={mockSongs}
            isGeneratingEnabled={true}  // make sure word cloud starts enabled
        />
    );

    // Start in "🛑 Stop Word Cloud" state
    const toggleButton = screen.getByRole('button', { name: /stop word cloud/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
        expect(screen.getByText(/❌ Please start the word cloud before generating./i)).toBeInTheDocument();
    });

    // You can also verify that no songs are visible now
    expect(screen.queryByText('Test Song 1')).not.toBeInTheDocument();
});

test('treats missing lyrics as empty string without crashing', async () => {
    // Simulate missing lyrics
    axios.get.mockResolvedValueOnce({
        data: { lyrics: undefined } // 👈 No lyrics provided
    });

    render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} isGeneratingEnabled={true} />);

    await waitFor(() => {
        // After "generation", there should be no word displayed since lyrics were empty
        expect(screen.queryByText(/sunshine/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/happiness/i)).not.toBeInTheDocument();
    });

    // Additionally you can check: no words rendered
    const wordCloud = document.querySelector("#view-cloud");
    expect(wordCloud).toBeTruthy();
});
test('stopping word cloud clears wordCloudSongs', async () => {
    axios.get.mockResolvedValue({
        data: { lyrics: 'sunshine rainbow happiness' }
    });

    render(
        <WordCloudPanel
            user={mockUser}
            wordCloudSongs={mockSongs}
            loading={true}
            isGeneratingEnabled={true}
        />
    );

    // Wait for word cloud to render
    expect(await screen.findByText('sunshine')).toBeInTheDocument();

    // Click the "Stop Word Cloud" button
    fireEvent.click(screen.getByRole('button', { name: /stop word cloud/i }));

    // After stopping, songs should be cleared — no songs rendered
    await waitFor(() => {
        expect(screen.queryByText('Test Song 1')).not.toBeInTheDocument();
    });

    // Bonus: You can also check if "0 songs" appears
    expect(screen.getByText(/0 songs/i)).toBeInTheDocument();

    // And error message updates
    expect(screen.getByText(/please start the word cloud/i)).toBeInTheDocument();
});

test('stopping word cloud clears all states and shows stop message', async () => {
    axios.get.mockResolvedValue({
        data: { lyrics: 'sunshine rainbow happiness' }
    });

    const { getByRole, queryByText, getByText } = render(
        <WordCloudPanel
            user={mockUser}
            wordCloudSongs={mockSongs}
            loading={false}
            isGeneratingEnabled={true}
        />
    );

    // Wait until a word appears -> means word cloud generated
    await screen.findByText('sunshine');

    // 1. Simulate clicking the Stop Word Cloud button
    fireEvent.click(getByRole('button', { name: /stop word cloud/i }));

    // 2. Confirm word cloud is cleared (no words visible anymore)
    await waitFor(() => {
        expect(queryByText('sunshine')).not.toBeInTheDocument();
        expect(queryByText('happiness')).not.toBeInTheDocument();
        expect(queryByText('rainbow')).not.toBeInTheDocument();
    });

    // 3. Confirm no songs are listed anymore
    expect(queryByText('Test Song 1')).not.toBeInTheDocument();

    // 4. Confirm status message changed to stop message
    expect(getByText(/❌ Please start the word cloud/i)).toBeInTheDocument();
});

