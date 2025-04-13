import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import WordCloudPanel from './WordCloudPanel';

// Mock axios
jest.mock('axios');

describe('WordCloudPanel Component', () => {
    const mockUser = 'testUser';
    const mockSongs = [
        {
            songId: '1',
            title: 'Test Song 1',
            url: 'http://test.com/1',
            imageUrl: 'http://test.com/img1.jpg',
            releaseDate: '2023-01-01',
            artistName: 'Test Artist 1'
        },
        {
            songId: '2',
            title: 'Test Song 2',
            url: 'http://test.com/2',
            imageUrl: 'http://test.com/img2.jpg',
            releaseDate: '2023-02-01',
            artistName: 'Test Artist 2'
        }
    ];

    const mockLyricsResponse1 = {
        data: {
            lyrics: 'These are test lyrics with unique words like sunshine happiness rainbow'
        }
    };

    const mockLyricsResponse2 = {
        data: {
            lyrics: 'Different lyrics with unique words like moonlight happiness stars'
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders loading state correctly', () => {
        render(<WordCloudPanel user={mockUser} loading={true} />);
        expect(screen.getByText(/generating word cloud/i)).toBeInTheDocument();
    });

    test('fetches songs when no songs are provided', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/wordcloud/')) {
                return Promise.resolve({ data: mockSongs });
            } else if (url.includes('/api/genius/lyrics')) {
                return Promise.resolve(mockLyricsResponse1);
            }
            return Promise.reject(new Error('Unexpected URL'));
        });

        render(<WordCloudPanel user={mockUser} />);

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(`http://localhost:8080/api/wordcloud/${mockUser}`);
        });
    });

    test('generates word cloud from provided songs', async () => {
        axios.get.mockImplementation((url, { params }) => {
            if (url.includes('/api/genius/lyrics')) {
                if (params.songId === '1') {
                    return Promise.resolve(mockLyricsResponse1);
                } else {
                    return Promise.resolve(mockLyricsResponse2);
                }
            }
            return Promise.reject(new Error('Unexpected URL'));
        });

        render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} />);

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(
                'http://localhost:8080/api/genius/lyrics',
                { params: { songId: '1' }}
            );
        });

        // We should see some of the words from our mock lyrics
        await waitFor(() => {
            expect(screen.getByText('sunshine')).toBeInTheDocument();
            expect(screen.getByText('happiness')).toBeInTheDocument();
            expect(screen.getByText('moonlight')).toBeInTheDocument();
        });
    });

    test('switches between cloud and table view', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/wordcloud/')) {
                return Promise.resolve({ data: mockSongs });
            } else if (url.includes('/api/genius/lyrics')) {
                return Promise.resolve(mockLyricsResponse1);
            }
            return Promise.reject(new Error('Unexpected URL'));
        });

        render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} />);

        // Wait for word cloud to generate
        await waitFor(() => {
            expect(screen.getByText('happiness')).toBeInTheDocument();
        });

        // Switch to table view
        fireEvent.click(screen.getByRole('button', { name: /table/i }));


        // Check for table headers
        expect(screen.getByText('Word')).toBeInTheDocument();
        expect(screen.getByText('Count')).toBeInTheDocument();

        // Switch back to cloud view
        fireEvent.click(screen.getByRole('button', { name: /Word Cloud/i }));

        // Should be back to cloud view with no table headers
        expect(screen.queryByText('Word')).not.toBeInTheDocument();
        expect(screen.queryByText('Count')).not.toBeInTheDocument();
    });

    test('shows related songs when clicking on a word', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/wordcloud/')) {
                return Promise.resolve({ data: mockSongs });
            } else if (url.includes('/api/genius/lyrics')) {
                return Promise.resolve(mockLyricsResponse1);
            }
            return Promise.reject(new Error('Unexpected URL'));
        });

        render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} />);

        // Wait for word cloud to generate
        await waitFor(() => {
            expect(screen.getByText('happiness')).toBeInTheDocument();
        });

        // Click on a word
        fireEvent.click(screen.getByText('happiness'));

        // Should show related songs section
        expect(screen.getByText(/songs containing "happiness"/i)).toBeInTheDocument();
        expect(screen.getByText('Test Song 1')).toBeInTheDocument();
    });

    test('handles adding song to favorites', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/wordcloud/')) {
                return Promise.resolve({ data: mockSongs });
            } else if (url.includes('/api/genius/lyrics')) {
                return Promise.resolve(mockLyricsResponse1);
            }
            return Promise.reject(new Error('Unexpected URL'));
        });

        axios.post.mockResolvedValueOnce({});

        render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} />);

        // Wait for word cloud to generate
        await waitFor(() => {
            expect(screen.getByText('happiness')).toBeInTheDocument();
        });

        // Click on a word to show related songs
        fireEvent.click(screen.getByText('happiness'));

        // Hover over a song to show the Add to Favorites button
        fireEvent.mouseEnter(screen.getByText('Test Song 1').closest('div'));

        // Click the Add to Favorites button
        fireEvent.click(screen.getByText('Add to Favorites'));

        // Verify the API call was made
        expect(axios.post).toHaveBeenCalledWith(
            'http://localhost:8080/api/favorites/add',
            expect.objectContaining({
                username: mockUser,
                songId: '1',
                title: 'Test Song 1'
            })
        );

        // Should show success message
        await waitFor(() => {
            expect(screen.getByText(/added test song 1 to favorites/i)).toBeInTheDocument();
        });
    });

    test('handles removing song from word cloud', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/wordcloud/')) {
                return Promise.resolve({ data: mockSongs });
            } else if (url.includes('/api/genius/lyrics')) {
                return Promise.resolve(mockLyricsResponse1);
            }
            return Promise.reject(new Error('Unexpected URL'));
        });

        axios.delete.mockResolvedValueOnce({});

        render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} />);

        // Wait for the songs list to be displayed
        await waitFor(() => {
            expect(screen.getByText('🎵 Test Song 1')).toBeInTheDocument();
        });

        // Find and click the Remove button for the first song
        const removeButtons = screen.getAllByText('Remove');
        fireEvent.click(removeButtons[0]);

        // Verify the API call was made
        expect(axios.delete).toHaveBeenCalledWith(
            `http://localhost:8080/api/wordcloud/remove/${mockUser}/1`
        );
    });

    test('handles API errors gracefully', async () => {
        // Mock the API call to fail
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/wordcloud/')) {
                return Promise.reject(new Error('Network error'));
            }
            return Promise.reject(new Error('Unexpected URL'));
        });

        // Spy on console.error
        jest.spyOn(console, 'error').mockImplementation(() => {});

        render(<WordCloudPanel user={mockUser} />);

        // Wait for the API call to happen
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(`http://localhost:8080/api/wordcloud/${mockUser}`);
            expect(console.error).toHaveBeenCalled();
        });

        // Clean up the spy
        console.error.mockRestore();
    });

    test('shows error message when adding to favorites fails', async () => {
        const brokenSong = {
            songId: '3',
            title: 'Already in Favorites',
            url: 'http://test.com/3',
            imageUrl: 'http://test.com/img3.jpg',
            releaseDate: '2023-03-01',
            artistName: 'Artist 3',
            lyrics: 'Sample lyrics'
        };

        axios.get.mockImplementation((url) => {
            if (url.includes('/api/genius/lyrics')) {
                return Promise.resolve({ data: { lyrics: 'some lyrics here' } });
            }
            return Promise.reject(new Error('Unexpected URL'));
        });

        axios.post.mockRejectedValueOnce(new Error('Already exists'));

        render(<WordCloudPanel user={mockUser} wordCloudSongs={[brokenSong]} />);

        // Wait for word cloud to generate
        await waitFor(() => {
            expect(screen.getByText('some')).toBeInTheDocument(); // word from lyrics
        });

        // Simulate clicking on a word
        fireEvent.click(screen.getByText('some'));

        // Hover over the related song
        fireEvent.mouseEnter(screen.getByText('Already in Favorites').closest('div'));

        // Click Add to Favorites
        fireEvent.click(screen.getByText('Add to Favorites'));

        // Expect status message to show failure
        await waitFor(() => {
            expect(screen.getByText(/❌ Could not add Already in Favorites/i)).toBeInTheDocument();
        });
    });
    test('logs error when removing a song from word cloud fails', async () => {
        const mockUser = "testUser";
        const mockSongs = [
            {
                songId: "1",
                title: "Test Song",
                url: "http://test.com/1",
                imageUrl: "http://test.com/img1.jpg",
                releaseDate: "2023-01-01",
                artistName: "Test Artist",
                lyrics: "some lyrics here"
            }
        ];

        axios.get.mockImplementation((url) => {
            if (url.includes('/api/genius/lyrics')) {
                return Promise.resolve({ data: { lyrics: 'some lyrics here' } });
            } else if (url.includes('/api/wordcloud/')) {
                return Promise.resolve({ data: mockSongs });
            }
            return Promise.reject(new Error('Unexpected URL'));
        });

        // ❌ Make the delete request fail
        axios.delete.mockRejectedValueOnce(new Error('Remove failed'));

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} />);

        // Wait until song is shown
        await waitFor(() => {
            expect(screen.getByText('🎵 Test Song')).toBeInTheDocument();
        });

        // Try to remove it
        fireEvent.click(screen.getByText('Remove'));

        // Check that the error was logged
        await waitFor(() => {
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Failed to remove song from word cloud:",
                expect.any(Error)
            );
        });

        consoleErrorSpy.mockRestore();
    });

    test('hides Add to Favorites button on mouse leave', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/wordcloud/')) {
                return Promise.resolve({ data: mockSongs });
            } else if (url.includes('/api/genius/lyrics')) {
                return Promise.resolve(mockLyricsResponse1);
            }
            return Promise.reject(new Error('Unexpected URL'));
        });

        render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} />);

        // Wait for the word cloud to generate
        await waitFor(() => {
            expect(screen.getByText('happiness')).toBeInTheDocument();
        });

        // Click on a word to show related songs
        fireEvent.click(screen.getByText('happiness'));

        const songDiv = screen.getByText('Test Song 1').closest('div');

        // Hover to trigger the Add button
        fireEvent.mouseEnter(songDiv);
        expect(screen.getByText(/add to favorites/i)).toBeInTheDocument();

        // Mouse leave → should hide the Add button
        fireEvent.mouseLeave(songDiv);
        await waitFor(() => {
            expect(screen.queryByText(/add to favorites/i)).not.toBeInTheDocument();
        });
    });

    test('displays related songs when clicking a word in table view', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/wordcloud/')) {
                return Promise.resolve({ data: mockSongs });
            } else if (url.includes('/api/genius/lyrics')) {
                return Promise.resolve(mockLyricsResponse1);
            }
            return Promise.reject(new Error('Unexpected URL'));
        });

        render(<WordCloudPanel user={mockUser} wordCloudSongs={mockSongs} />);

        // Wait for lyrics and word cloud to generate
        await waitFor(() => {
            expect(screen.getByText('happiness')).toBeInTheDocument();
        });

        // Switch to tabular view
        fireEvent.click(screen.getByRole("button", {name: /Table/i}));

        // Wait for table rows to appear
        const tableRow = screen.getByText('happiness').closest('tr');
        expect(tableRow).toBeInTheDocument();

        // Click the row
        fireEvent.click(tableRow);

        // Should show related songs section for the clicked word
        await waitFor(() => {
            expect(screen.getByText(/songs containing "happiness"/i)).toBeInTheDocument();
            expect(screen.getByText('Test Song 1')).toBeInTheDocument();
        });
    });

});


describe("WordCloudPanel Error Handling", () => {
    const mockUser = "testUser";
    const mockSongs = [
        {
            songId: "1",
            title: "Broken Song",
            url: "http://test.com/1",
            imageUrl: "http://test.com/img1.jpg",
            releaseDate: "2023-01-01",
            artistName: "Test Artist"
        }
    ];
    test('handles failed lyrics fetch gracefully', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/wordcloud/')) {
                return Promise.resolve({ data: mockSongs });
            } else if (url.includes('/api/genius/lyrics')) {
                return Promise.reject(new Error('Lyrics fetch failed'));
            }
            return Promise.reject(new Error('Unexpected URL'));
        });

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        render(<WordCloudPanel user="testUser" wordCloudSongs={mockSongs} />);

        await waitFor(() => {
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Failed to fetch lyrics:",
                expect.any(Error)
            );
        });

        // Optionally: if you want to assert that the word map is empty
        expect(screen.queryByText(/songs containing/i)).not.toBeInTheDocument();

        consoleErrorSpy.mockRestore();
    });
    test('handles non-array response data by falling back to empty array', async () => {
        // Mock response where res.data is NOT an array
        axios.get.mockResolvedValueOnce({ data: { message: 'Not an array' } });

        render(<WordCloudPanel user={mockUser} />);

        // Wait for internal fetch to complete
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(`http://localhost:8080/api/wordcloud/${mockUser}`);
        });

        // Since res.data was not an array, the word cloud should be empty
        expect(screen.queryByText(/songs containing/i)).not.toBeInTheDocument();
    });
    test('handles missing lyrics in response gracefully', async () => {
        const mockSongs = [
            {
                songId: 'missing-lyrics',
                title: 'No Lyrics Song',
                url: 'http://test.com/nolyrics',
                imageUrl: 'http://test.com/img.jpg',
                releaseDate: '2023-01-01',
                artistName: 'Silent Artist'
            }
        ];

        axios.get.mockImplementation((url, { params }) => {
            if (url.includes('/api/genius/lyrics') && params.songId === 'missing-lyrics') {
                return Promise.resolve({ data: {} }); // No lyrics field
            }
            return Promise.resolve({ data: mockSongs });
        });

        render(<WordCloudPanel user="testUser" wordCloudSongs={mockSongs} />);

        // Wait for word cloud generation to complete
        await waitFor(() => {
            // Since no lyrics are present, no words should show up
            expect(screen.queryByText(/songs containing/i)).not.toBeInTheDocument();
        });
    });

});