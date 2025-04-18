import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    axios.get.mockResolvedValue(mockLyrics); // Every lyrics request gets the same fast response
});

test('displays loading spinner if loading prop is true', () => {
    render(<WordCloudPanel user={mockUser} wordCloudSongs={[]} loading={true} />);
    expect(screen.getByText(/generating word cloud/i)).toBeInTheDocument();
});

test('renders word cloud from one song and responds to word click', async () => {
    render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} />);

    // wait for one of the words to appear
    const word = await screen.findByText('sunshine');
    expect(word).toBeInTheDocument();

    // click on a word and verify related songs appear
    fireEvent.click(word);
    expect(await screen.findByText(/songs containing "sunshine"/i)).toBeInTheDocument();
    expect(screen.getByText('Test Song 1')).toBeInTheDocument();
});
test('toggles between cloud and table view', async () => {
    render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} />);
    await screen.findByText('sunshine');

    fireEvent.click(screen.getByRole('button', { name: /table/i }));
    expect(screen.getByText('Word')).toBeInTheDocument();
    expect(screen.getByText('Count')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /word cloud/i }));
    expect(screen.queryByText('Word')).not.toBeInTheDocument();
});
test('adds song to favorites successfully', async () => {
    axios.post.mockResolvedValue({});

    render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} />);
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

    render(<WordCloudPanel user={mockUser} wordCloudSongs={twoSongs} />);

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

    render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} />);
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
    const errorSong = {
        songId: 'broken-123',
        title: 'Broken Song',
        url: 'http://test.com/broken',
        imageUrl: 'http://test.com/img.jpg',
        releaseDate: '2023-04-01',
        artistName: 'Broken Artist'
    };

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    axios.get.mockRejectedValueOnce(new Error('Lyrics fetch failed'));

    render(<WordCloudPanel user={mockUser} wordCloudSongs={[errorSong]} />);

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

    render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} />);

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

test('clicking a word in table view shows related songs', async () => {
    axios.get.mockResolvedValue({
        data: { lyrics: 'rainbow sunshine happiness' }
    });

    render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} />);

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
