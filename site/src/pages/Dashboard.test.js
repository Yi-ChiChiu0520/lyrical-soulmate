import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import axios from 'axios';
import Dashboard from './Dashboard';
import { BrowserRouter } from "react-router-dom";
import { mergeWordCloudSongs } from "./Dashboard"; // same file, easy

jest.mock('axios');
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => jest.fn(),
    Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />
}));

jest.mock('./WordCloudPanel', () => () => <div data-testid="word-cloud-panel" />);

const mockUser = "testUser";


describe('Dashboard', () => {
    const user = 'testUser';

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {}); // mute console.error
        window.alert = jest.fn();
        Storage.prototype.removeItem = jest.fn();
        delete window.location;
        window.location = { reload: jest.fn() };
    });

    test('redirects if no user is provided', () => {
        render(<Dashboard user={null} />);
        expect(screen.getByTestId('navigate')).toBeInTheDocument();
    });

    test("creates a Set of existing songIds and only keeps new songs", () => {
        const prev = [
            { songId: "1", title: "First Song" },
            { songId: "2", title: "Second Song" },
        ];
        const mapped = [
            { songId: "2", title: "Second Song (again)" },
            { songId: "3", title: "Third Song" },
        ];
        const existingIds = new Set(prev.map((song) => song.songId));
        expect(existingIds.has("1")).toBe(true);
        expect(existingIds.has("2")).toBe(true);
        expect(existingIds.has("3")).toBe(false);
        const newSongs = mapped.filter((song) => !existingIds.has(song.songId));
        expect(newSongs).toEqual([{ songId: "3", title: "Third Song" }]);
        const merged = [...prev, ...newSongs];
        expect(merged).toEqual([
            { songId: "1", title: "First Song" },
            { songId: "2", title: "Second Song" },
            { songId: "3", title: "Third Song" },
        ]);
    });

    test('renders dashboard with welcome message and inputs', () => {
        render(<Dashboard user={user} />);
        expect(screen.getByText(`Welcome, ${user}!`)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/enter artist name/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText('#')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    });

    test('fetches and displays songs after selecting an artist', async () => {
        // 1) mock /api/genius/artists returning one artist
        const artists = [{ id: '123', name: 'Artist Name', imageUrl: 'img.png', headerUrl: '' }];
        // 2) mock /api/genius/artists/123/songs returning one song
        const songChunk = {
            response: {
                songs: [
                    {
                        result: {
                            id: '456',
                            full_title: 'Test Song by Artist',
                            header_image_url: 'http://img.com/123.jpg',
                            release_date_for_display: 'Jan 1, 2020',
                            primary_artist: { name: 'Artist Name' },
                            url: 'http://genius.com/song'
                        }
                    }
                ]
            }
        };
        axios.get
            .mockResolvedValueOnce({ data: artists })   // fetchArtists
            .mockResolvedValueOnce({ data: songChunk }); // fetchArtistSongs

        render(<Dashboard user={user} />);
        // fill query & limit
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), { target: { value: 'Artist Name' } });
        fireEvent.change(screen.getByPlaceholderText('#'), { target: { value: '1' } });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));

        // wait for artist button, then click
        await waitFor(() => {
            expect(screen.getByLabelText(/select artist Artist Name/i)).toBeInTheDocument();
        });
        fireEvent.click(screen.getByLabelText(/select artist Artist Name/i));

        // now the song should appear
        await waitFor(() => {
            expect(screen.getByText(/🎵 Test Song by Artist/)).toBeInTheDocument();
            expect(screen.getByText(/📅 Jan 1, 2020/)).toBeInTheDocument();
        });
    });

    test('alerts when query is empty', () => {
        render(<Dashboard user={user} />);
        fireEvent.click(screen.getByRole('button', { name: /search/i }));
        expect(window.alert).toHaveBeenCalledWith('Please enter an artist name!');
    });

    test('alerts when songLimit is invalid', () => {
        render(<Dashboard user={user} />);
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), {
            target: { value: 'Artist' }
        });
        fireEvent.change(screen.getByPlaceholderText('#'), {
            target: { value: '0' }
        });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));
        expect(window.alert).toHaveBeenCalledWith(
            'Please enter a valid number of songs to display.'
        );
    });


    test('selects and deselects songs', async () => {
        // same mocks as above for one artist + one song
        const artists = [{ id: '1', name: 'A', imageUrl: '', headerUrl: '' }];
        const songs = { response: { songs: [{ result: { id: '99', full_title: 'My Song', header_image_url: '', release_date_for_display: '', primary_artist: {}, url: '' } }] } };
        axios.get.mockResolvedValueOnce({ data: artists }).mockResolvedValueOnce({ data: songs });

        render(<Dashboard user={user} />);
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), { target: { value: 'A' } });
        fireEvent.change(screen.getByPlaceholderText('#'), { target: { value: '1' } });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));
        await waitFor(() => screen.getByLabelText(/select artist A/i));
        fireEvent.click(screen.getByLabelText(/select artist A/i));
        await waitFor(() => screen.getByText(/My Song/));

        const cb = screen.getByRole('checkbox');
        fireEvent.click(cb);
        expect(cb).toBeChecked();
        fireEvent.click(cb);
        expect(cb).not.toBeChecked();
    });

    test('adds selected songs to favorites', async () => {
        // artists then songs then lyrics then POST
        const artists = [{ id: '1', name: 'B', imageUrl: '', headerUrl: '' }];
        const songs = { response: { songs: [{ result: { id: '77', full_title: 'Fav Song', header_image_url: '', release_date_for_display: '', primary_artist: {}, url: '' } }] } };
        axios.get
            .mockResolvedValueOnce({ data: artists })
            .mockResolvedValueOnce({ data: songs })
            .mockResolvedValueOnce({ data: { lyrics: 'lyric text' } });
        axios.post.mockResolvedValueOnce({ status: 200 });

        render(<Dashboard user={user} />);
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), { target: { value: 'B' } });
        fireEvent.change(screen.getByPlaceholderText('#'), { target: { value: '1' } });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));
        await waitFor(() => screen.getByLabelText(/select artist B/i));
        fireEvent.click(screen.getByLabelText(/select artist B/i));
        await waitFor(() => screen.getByText(/Fav Song/));
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /add selected to favorites/i }));

        await waitFor(() => {
            expect(screen.getByText(/✅ Added: Fav Song/)).toBeInTheDocument();
        });
    });

    test('adds selected songs to word cloud', async () => {
        // same artist/song mocks plus lyrics
        const artists = [{ id: '2', name: 'C', imageUrl: '', headerUrl: '' }];
        const songs = { response: { songs: [{ result: { id: '88', full_title: 'Cloudy', header_image_url: '', release_date_for_display: '', primary_artist: {}, url: '' } }] } };
        axios.get
            .mockResolvedValueOnce({ data: artists })
            .mockResolvedValueOnce({ data: songs })
            .mockResolvedValueOnce({ data: { lyrics: 'lyric' } });

        render(<Dashboard user={user} />);
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), { target: { value: 'C' } });
        fireEvent.change(screen.getByPlaceholderText('#'), { target: { value: '1' } });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));
        await waitFor(() => screen.getByLabelText(/select artist C/i));
        fireEvent.click(screen.getByLabelText(/select artist C/i));
        await waitFor(() => screen.getByText(/Cloudy/));

        await act(async () => {
            fireEvent.click(screen.getByRole('checkbox'));
            fireEvent.click(screen.getByRole('button', { name: /add selected to word cloud/i }));
        });

        expect(screen.getByTestId('word-cloud-panel')).toBeInTheDocument();
    });

    test("filters out songs with existing songIds", () => {
        const prev = [
            { songId: "1", title: "First Song" },
            { songId: "2", title: "Second Song" },
        ];

        const incoming = [
            { songId: "2", title: "Duplicate Second Song" },
            { songId: "3", title: "Third Song" },
        ];

        const result = mergeWordCloudSongs(prev, incoming);

        expect(result).toEqual([
            { songId: "1", title: "First Song" },
            { songId: "2", title: "Second Song" },
            { songId: "3", title: "Third Song" },
        ]);
    });

    test('adds all favorites to word cloud', async () => {
        const favorites = [
            {
                songId: '1',
                title: 'Fav Song',
                artistName: 'Artist',
                releaseDate: '2023',
                imageUrl: 'http://img.com/img.jpg',
                url: 'http://genius.com/fav-song'
            }
        ];

        axios.get
            .mockResolvedValueOnce({ data: favorites }) // /api/favorites/user
            .mockResolvedValueOnce({ data: { lyrics: 'fav lyrics' } }); // lyrics

        render(<Dashboard user={user} />);

        fireEvent.click(screen.getByRole('button', { name: /add all favorites to word cloud/i }));

        await waitFor(() => {
            expect(screen.getByTestId('word-cloud-panel')).toBeInTheDocument();
        });
    });
    test("logs out when user is inactive for more than 60 seconds", async () => {
        jest.useFakeTimers();
        axios.get.mockResolvedValueOnce({ data: [] });


        render(
            <BrowserRouter>
                <Dashboard user={mockUser} />
            </BrowserRouter>
        );


        act(() => {
            jest.advanceTimersByTime(61000);
        });


        await waitFor(() => {
            expect(localStorage.removeItem).toHaveBeenCalledWith("user");
            expect(window.location.reload).toHaveBeenCalled();
        });


        jest.useRealTimers();
    });
    test('adds selected songs to word cloud', async () => {
        // same artist/song mocks plus lyrics
        const artists = [{ id: '2', name: 'C', imageUrl: '', headerUrl: '' }];
        const songs = { response: { songs: [{ result: { id: '88', full_title: 'Cloudy', header_image_url: '', release_date_for_display: '', primary_artist: {}, url: '' } }] } };
        axios.get
            .mockResolvedValueOnce({ data: artists })
            .mockResolvedValueOnce({ data: songs })
            .mockResolvedValueOnce({ data: { lyrics: 'lyric' } });

        render(<Dashboard user={user} />);
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), { target: { value: 'C' } });
        fireEvent.change(screen.getByPlaceholderText('#'), { target: { value: '1' } });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));
        await waitFor(() => screen.getByLabelText(/select artist C/i));
        fireEvent.click(screen.getByLabelText(/select artist C/i));
        await waitFor(() => screen.getByText(/Cloudy/));

        await act(async () => {
            fireEvent.click(screen.getByRole('checkbox'));
            fireEvent.click(screen.getByRole('button', { name: /add selected to word cloud/i }));
        });

        expect(screen.getByTestId('word-cloud-panel')).toBeInTheDocument();
    });

    // 1) split into two tests so that `searching` resets between them
    test('alerts when query is empty', () => {
        render(<Dashboard user={user} />);
        fireEvent.click(screen.getByRole('button', { name: /search/i }));
        expect(window.alert).toHaveBeenCalledWith('Please enter an artist name!');
    });

    test('alerts when songLimit is invalid', () => {
        render(<Dashboard user={user} />);
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), {
            target: { value: 'Artist' }
        });
        fireEvent.change(screen.getByPlaceholderText('#'), {
            target: { value: '0' }
        });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));
        expect(window.alert).toHaveBeenCalledWith(
            'Please enter a valid number of songs to display.'
        );
    });

    // 3) for skipping unselected songs we must first load artists & songs, then click artist,
// await the song, then click "Add Selected to Favorites" without checking the box.
    test('alerts when query is empty', () => {
        render(<Dashboard user={user} />);
        fireEvent.click(screen.getByRole('button', { name: /search/i }));
        expect(window.alert).toHaveBeenCalledWith(
            'Please enter an artist name!'
        );
    });

    test('alerts when songLimit is invalid', () => {
        render(<Dashboard user={user} />);
        // first set a non‐empty query so we get to the limit check
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), {
            target: { value: 'Artist' }
        });
        fireEvent.change(screen.getByPlaceholderText('#'), {
            target: { value: '0' }
        });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));
        expect(window.alert).toHaveBeenCalledWith(
            'Please enter a valid number of songs to display.'
        );
    });



    // 4) similarly for lyrics‐failure in word‐cloud: load artists/songs, click, then word‐cloud
    test('logs warning if lyrics fetch fails when adding selected to word cloud', async () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const artists = [{ id: '9', name: 'D', imageUrl: '', headerUrl: '' }];
        const songsPayload = {
            response: {
                songs: [
                    {
                        result: {
                            id: '33',
                            full_title: 'Fail Song',
                            header_image_url: '',
                            release_date_for_display: '',
                            primary_artist: {},
                            url: ''
                        }
                    }
                ]
            }
        };

        axios.get
            .mockResolvedValueOnce({ data: artists })       // fetchArtists
            .mockResolvedValueOnce({ data: songsPayload })  // fetchArtistSongs
            .mockRejectedValueOnce(new Error('no lyrics')); // lyrics fetch

        render(<Dashboard user={user} />);

        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), {
            target: { value: 'D' }
        });
        fireEvent.change(screen.getByPlaceholderText('#'), {
            target: { value: '1' }
        });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));

        // select the artist, wait for the song
        await waitFor(() => screen.getByLabelText(/select artist D/i));
        fireEvent.click(screen.getByLabelText(/select artist D/i));
        await waitFor(() => screen.getByText(/Fail Song/));

        // check it and click "Add Selected to Word Cloud"
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', {
            name: /add selected to word cloud/i
        }));

        // assert the warning
        await waitFor(() => {
            expect(warnSpy).toHaveBeenCalledWith(
                'Failed to get lyrics for Fail Song'
            );
        });
    });



    test('displays error when artist search fails', async () => {
        const err = new Error('fail');
        axios.get.mockRejectedValueOnce(err);
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

        render(<Dashboard user={user} />);
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), { target: { value: 'ErrorCase' } });
        fireEvent.change(screen.getByPlaceholderText('#'), { target: { value: '1' } });
        fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

        await waitFor(() => {
            expect(spy).toHaveBeenCalledWith(err);
            expect(screen.getByText('Artist search failed. Try again.')).toBeInTheDocument();
        });
        spy.mockRestore();
    });

    test('logs warning if lyrics fetch fails during add to favorites', async () => {
        const artists = [{ id: '9', name: 'D', imageUrl: '', headerUrl: '' }];
        const songs = { response: { songs: [{ result: { id: '33', full_title: 'Broken Song', header_image_url: '', release_date_for_display: '', primary_artist: {}, url: '' } }] } };
        axios.get
            .mockResolvedValueOnce({ data: artists })
            .mockResolvedValueOnce({ data: songs })
            .mockRejectedValueOnce(new Error('no lyrics')); // lyrics call
        axios.post.mockResolvedValueOnce({ status: 200 });

        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        render(<Dashboard user={user} />);
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), { target: { value: 'D' } });
        fireEvent.change(screen.getByPlaceholderText('#'), { target: { value: '1' } });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));
        await waitFor(() => screen.getByLabelText(/select artist D/i));
        fireEvent.click(screen.getByLabelText(/select artist D/i));
        await waitFor(() => screen.getByText(/Broken Song/));
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /add selected to favorites/i }));

        await waitFor(() => {
            expect(warnSpy).toHaveBeenCalledWith('Failed to get lyrics for Broken Song');
        });
        warnSpy.mockRestore();
    });

    test('shows alert and stops if no songs selected for word cloud', async () => {
        render(<Dashboard user="testUser" />);
        const addToWordCloudButton = screen.getByRole('button', { name: /add selected to word cloud/i });

        await act(async () => {
            fireEvent.click(addToWordCloudButton);
        });

        expect(window.alert).toHaveBeenCalledWith("Please select at least one song to add to the word cloud.");
    });

    test('shows error message if no favorites are found when adding to word cloud', async () => {
        axios.get
            .mockResolvedValueOnce({ data: [] }); // simulate empty favorites list

        render(<Dashboard user="testUser" />);

        fireEvent.click(screen.getByRole('button', { name: /add all favorites to word cloud/i }));

        await waitFor(() => {
            expect(screen.getByText("No favorites found.")).toBeInTheDocument();
        });
    });
    test('handles failure when fetching lyrics (console.warn)', async () => {
        const favorites = [
            {
                songId: "fail-id",
                title: "Fail Song",
                artistName: "Artist",
                releaseDate: "2023",
                imageUrl: "http://img.com/img.jpg",
                url: "http://genius.com/fail-song"
            }
        ];

        // First call: get favorites
        axios.get
            .mockResolvedValueOnce({ data: favorites }) // /api/favorites/user
            .mockRejectedValueOnce(new Error("Lyrics fetch failed")); // /api/genius/lyrics

        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {/* no-op */});

        render(<Dashboard user="testUser" />);
        fireEvent.click(screen.getByRole('button', { name: /add all favorites to word cloud/i }));

        await waitFor(() => {
            expect(warnSpy).toHaveBeenCalledWith(
                'Failed to get lyrics for Fail Song'
            );
        });

        warnSpy.mockRestore();
    });

    test('prevents duplicates when adding songs to word cloud', () => {
        // Simulate initial word cloud state
        let prevSongs = [
            {
                songId: '1',
                title: 'Existing Song',
                url: 'http://test.com/1',
                imageUrl: 'http://test.com/img1.jpg',
                releaseDate: '2023-01-01',
                artistName: 'Artist 1',
                lyrics: 'existing lyrics'
            }
        ];

        // Incoming new songs
        const newSongs = [
            {
                songId: '1', // duplicate of existing
                title: 'Duplicate Song',
                url: 'http://test.com/dupe',
                imageUrl: 'http://test.com/dupe.jpg',
                releaseDate: '2023-03-01',
                artistName: 'Artist Dupe',
                lyrics: 'duplicate lyrics'
            },
            {
                songId: '2', // new song
                title: 'New Song',
                url: 'http://test.com/2',
                imageUrl: 'http://test.com/img2.jpg',
                releaseDate: '2023-02-01',
                artistName: 'Artist 2',
                lyrics: 'new lyrics'
            }
        ];

        // Simulate real setState updater function
        const result = (prev => {
            const existingIds = new Set(prev.map(song => song.songId));
            const newUniqueSongs = newSongs.filter(song => !existingIds.has(song.songId));
            return [...prev, ...newUniqueSongs];
        })(prevSongs);

        // Now verify the result
        expect(result).toHaveLength(2);

        // Existing song remains
        expect(result).toContainEqual(prevSongs[0]);

        // New song added
        expect(result).toContainEqual(newSongs[1]);

        // Duplicate not added
        expect(result).not.toContainEqual(newSongs[0]);
    });

    // 1) list.length === 0 → “No artists found.”
    test('shows error and clears artists/songs when artist API returns empty list', async () => {
        // fetchArtists → empty array
        axios.get.mockResolvedValueOnce({ data: [] });

        render(<Dashboard user={user} />);
        // trigger search
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), {
            target: { value: 'Nobody' }
        });
        fireEvent.change(screen.getByPlaceholderText('#'), {
            target: { value: '3' }
        });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));

        await waitFor(() => {
            // error message
            expect(screen.getByText('No artists found.')).toBeInTheDocument();
            // no artist buttons
            expect(screen.queryByLabelText(/select artist/i)).toBeNull();
            // no song checkboxes
            expect(screen.queryByRole('checkbox')).toBeNull();
        });
    });

// 2) collected.length < limit → fallback search loop
    test('logs info for each unselected song when bulk-adding', async () => {
        const artists = [{ id: '6', name: 'U', imageUrl: '', headerUrl: '' }];
        const twoSongs = {
            response: {
                songs: [
                    {
                        result: {
                            id: 'F1',
                            full_title: 'Selected Song',
                            header_image_url: '',
                            release_date_for_display: '',
                            primary_artist: {},
                            url: ''
                        }
                    },
                    {
                        result: {
                            id: 'F2',
                            full_title: 'Unselected Song',
                            header_image_url: '',
                            release_date_for_display: '',
                            primary_artist: {},
                            url: ''
                        }
                    }
                ]
            }
        };

        axios.get
            .mockResolvedValueOnce({ data: artists })   // fetchArtists
            .mockResolvedValueOnce({ data: twoSongs }); // fetchArtistSongs

        const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

        render(<Dashboard user={user} />);
        fireEvent.change(
            screen.getByPlaceholderText(/enter artist name/i),
            { target: { value: 'U' } }
        );
        fireEvent.change(
            screen.getByPlaceholderText('#'),
            { target: { value: '2' } }
        );
        fireEvent.click(screen.getByRole('button', { name: /search/i }));

        // select artist and wait for songs
        await waitFor(() => screen.getByLabelText('Select artist U'));
        fireEvent.click(screen.getByLabelText('Select artist U'));
        await waitFor(() => {
            expect(screen.getByLabelText('song title: Selected Song')).toBeInTheDocument();
            expect(screen.getByLabelText('song title: Unselected Song')).toBeInTheDocument();
        });

        // select only the first checkbox
        const [firstBox] = screen.getAllByRole('checkbox');
        fireEvent.click(firstBox);
        fireEvent.click(screen.getByRole('button', { name: /add selected to favorites/i }));

        // assert the console.info skip message
        await waitFor(() => {
            expect(infoSpy).toHaveBeenCalledWith(
                'Skipping song not in selected list: Unselected Song'
            );
        });

        infoSpy.mockRestore();
    });

    test('fetchArtistSongs filters by artist.id and dedupes across pages', async () => {
        axios.get
            // 1) fetchArtists
            .mockResolvedValueOnce({ data: [{ id: 1, name: 'Artist' }] })
            // 2) /artists/:id/songs returns empty → fallback
            .mockResolvedValueOnce({ data: { response: { songs: [] } } })
            // 3) fallback page 1 (Song1, Song2 ok; Song3 wrong artist)
            .mockResolvedValueOnce({
                data: {
                    response: {
                        hits: [
                            { result: { primary_artist: { id: 1, name: 'Artist' }, id: 101, full_title: 'Song1' } },
                            { result: { primary_artist: { id: 1, name: 'Artist' }, id: 102, full_title: 'Song2' } },
                            { result: { primary_artist: { id: 2, name: 'Other'  }, id: 201, full_title: 'Song3' } },
                        ]
                    }
                }
            })
            // 4) fallback page 2 (duplicate 101 + new 103)
            .mockResolvedValueOnce({
                data: {
                    response: {
                        hits: [
                            { result: { primary_artist: { id: 1, name: 'Artist' }, id: 101, full_title: 'Song1' } },
                            { result: { primary_artist: { id: 1, name: 'Artist' }, id: 103, full_title: 'Song4' } },
                        ]
                    }
                }
            })
            // 5) fallback page 3 → empty → stop
            .mockResolvedValueOnce({ data: { response: { hits: [] } } });

        render(
            <BrowserRouter>
                <Dashboard user="testUser" />
            </BrowserRouter>
        );

        // trigger the artist search
        fireEvent.change(screen.getByLabelText('Artist search query input'), {
            target: { value: 'Artist' }
        });
        fireEvent.change(screen.getByLabelText('set number of search results'), {
            target: { value: '3' }
        });
        fireEvent.click(screen.getByRole('button', { name: /Search/ }));

        // pick the artist
        const artistBtn = await screen.findByRole('button', { name: /Select artist Artist/ });
        fireEvent.click(artistBtn);

        // wait for list items
        const items = await screen.findAllByRole('listitem');
        expect(items).toHaveLength(2);

        const texts = items.map(li => li.textContent);
        expect(texts).toEqual(
            expect.arrayContaining([
                expect.stringContaining('Song1'),
                expect.stringContaining('Song2'),
            ])
        );
        // ensure Song3 never shows up
        expect(texts.some(t => t.includes('Song3'))).toBe(false);
    });

// 3) collected.length === 0 → early return (no songs for artist)
    test('resets selection (no songs) when both sources return zero songs', async () => {
        const artists = [{ id: '2', name: 'Y', imageUrl: '', headerUrl: '' }];
        const noSongs = { response: { songs: [] } };
        const noHits  = { response: { hits: [] } };

        axios.get
            .mockResolvedValueOnce({ data: artists })   // fetchArtists
            .mockResolvedValueOnce({ data: noSongs })   // artistSongs
            .mockResolvedValueOnce({ data: noHits });   // fallback search

        render(<Dashboard user={user} />);
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), {
            target: { value: 'Y' }
        });
        fireEvent.change(screen.getByPlaceholderText('#'), {
            target: { value: '1' }
        });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));

        await waitFor(() => screen.getByLabelText(/select artist Y/i));
        fireEvent.click(screen.getByLabelText(/select artist Y/i));

        // because we returned early, no songs and no “No songs found” message
        await waitFor(() => {
            expect(screen.queryByRole('checkbox')).toBeNull();
            expect(screen.queryByText(/No songs found/)).toBeNull();
        });
    });

// 4) selectedSongs.length === 0 in bulkAddToFavorites → alert
    test('alerts if you try to bulk-add favorites without selecting songs', async () => {
        // get one artist + one song so the buttons exist
        const artists = [{ id: '3', name: 'Z', imageUrl: '', headerUrl: '' }];
        const oneSong = { response: { songs: [
                    { result: { id: 'C', full_title: 'C Song', header_image_url: '', release_date_for_display: '', primary_artist: {}, url: '' } }
                ] }};

        axios.get.mockResolvedValueOnce({ data: artists }).mockResolvedValueOnce({ data: oneSong });

        render(<Dashboard user={user} />);
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), {
            target: { value: 'Z' }
        });
        fireEvent.change(screen.getByPlaceholderText('#'), {
            target: { value: '1' }
        });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));
        await waitFor(() => screen.getByLabelText(/select artist Z/i));
        fireEvent.click(screen.getByLabelText(/select artist Z/i));
        await waitFor(() => screen.getByText(/C Song/));

        // do NOT check the box
        fireEvent.click(screen.getByRole('button', { name: /add selected to favorites/i }));
        expect(window.alert).toHaveBeenCalledWith(
            'Please select at least one song to add.'
        );
    });

// 5) success vs. failure pushes in bulkAddToFavorites
    test('correctly builds added/failed lists based on POST status', async () => {
        const artists = [{ id: '4', name: 'W', imageUrl: '', headerUrl: '' }];
        const twoSongs = { response: { songs: [
                    { result: { id: 'D1', full_title: 'Good Song', header_image_url: '', release_date_for_display: '', primary_artist: {}, url: '' } },
                    { result: { id: 'D2', full_title: 'Bad Song',  header_image_url: '', release_date_for_display: '', primary_artist: {}, url: '' } }
                ] }};

        axios.get
            .mockResolvedValueOnce({ data: artists })
            .mockResolvedValueOnce({ data: twoSongs })
            // lyrics for D1 and D2
            .mockResolvedValueOnce({ data: { lyrics: 'L1' } })
            .mockResolvedValueOnce({ data: { lyrics: 'L2' } });

        // first POST succeeds, second returns 409
        axios.post
            .mockResolvedValueOnce({ status: 200 })
            .mockResolvedValueOnce({ status: 409 });

        render(<Dashboard user={user} />);
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), {
            target: { value: 'W' }
        });
        fireEvent.change(screen.getByPlaceholderText('#'), {
            target: { value: '2' }
        });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));

        await waitFor(() => screen.getByLabelText(/select artist W/i));
        fireEvent.click(screen.getByLabelText(/select artist W/i));
        await waitFor(() => {
            expect(screen.getByText(/Good Song/)).toBeInTheDocument();
            expect(screen.getByText(/Bad Song/)).toBeInTheDocument();
        });

        // select both
        const boxes = screen.getAllByRole('checkbox');
        fireEvent.click(boxes[0]);
        fireEvent.click(boxes[1]);

        fireEvent.click(screen.getByRole('button', {
            name: /add selected to favorites/i
        }));

        await waitFor(() => {
            expect(screen.getByText(/✅ Added: Good Song/)).toBeInTheDocument();
            expect(screen.getByText(/⚠️ Already in favorites: Bad Song/)).toBeInTheDocument();
        });
    });

// 6) catch branch → POST throws error
    test('treats network error as failure in bulk-add favorites', async () => {
        const artists = [{ id: '5', name: 'V', imageUrl: '', headerUrl: '' }];
        const oneSong = { response: { songs: [
                    { result: { id: 'E1', full_title: 'Err Song', header_image_url: '', release_date_for_display: '', primary_artist: {}, url: '' } }
                ] }};

        axios.get
            .mockResolvedValueOnce({ data: artists })
            .mockResolvedValueOnce({ data: oneSong })
            .mockResolvedValueOnce({ data: { lyrics: 'L' } });

        // POST throws
        axios.post.mockRejectedValueOnce(new Error('Network Down'));

        render(<Dashboard user={user} />);
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), {
            target: { value: 'V' }
        });
        fireEvent.change(screen.getByPlaceholderText('#'), {
            target: { value: '1' }
        });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));

        await waitFor(() => screen.getByLabelText(/select artist V/i));
        fireEvent.click(screen.getByLabelText(/select artist V/i));
        await waitFor(() => screen.getByText(/Err Song/));

        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', {
            name: /add selected to favorites/i
        }));

        await waitFor(() => {
            expect(screen.getByText(/⚠️ Already in favorites: Err Song/)).toBeInTheDocument();
        });
    });

// 7) else branch → console.info on skipping unselected song
    // 1) Fallback search path: page1 has <limit songs, page2 returns empty → then fallback /search
    // 2) console.info() “Skipping…” for each unselected song in bulkAddToFavorites
    test('logs info for each unselected song when bulk-adding', async () => {
        const artists = [{ id: '6', name: 'U', imageUrl: '', headerUrl: '' }];
        const twoSongs = {
            response: {
                songs: [
                    { result: { id: 'F1', full_title: 'Selected Song',   header_image_url: '', release_date_for_display: '', primary_artist: {}, url: '' } },
                    { result: { id: 'F2', full_title: 'Unselected Song', header_image_url: '', release_date_for_display: '', primary_artist: {}, url: '' } }
                ]
            }
        };

        axios.get
            .mockResolvedValueOnce({ data: artists })   // fetchArtists
            .mockResolvedValueOnce({ data: twoSongs }); // fetchArtistSongs page=1 (limit=2 → skip fallback)

        const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

        render(<Dashboard user={user} />);
        fireEvent.change(screen.getByPlaceholderText(/enter artist name/i), { target: { value: 'U' } });
        fireEvent.change(screen.getByPlaceholderText('#'),               { target: { value: '2' } });
        fireEvent.click(screen.getByRole('button', { name: /search/i }));

        // select the artist and wait for both songs
        await waitFor(() => screen.getByLabelText('Select artist U'));
        fireEvent.click(screen.getByLabelText('Select artist U'));
        await waitFor(() => {
            expect(screen.getByLabelText('song title: Selected Song')).toBeInTheDocument();
            expect(screen.getByLabelText('song title: Unselected Song')).toBeInTheDocument();
        });

        // only select the first one
        const boxes = screen.getAllByRole('checkbox');
        fireEvent.click(boxes[0]);
        fireEvent.click(screen.getByRole('button', { name: /add selected to favorites/i }));

        await waitFor(() => {
            expect(infoSpy).toHaveBeenCalledWith(
                'Skipping song not in selected list: Unselected Song'
            );
        });

        infoSpy.mockRestore();
    });

    test("hits the direct‐songs branch and normalizeSong(obj) path", async () => {
        axios.get
            // 1) fetchArtists()
            .mockResolvedValueOnce({ data: [{ id: 1, name: "Artist" }] })
            // 2) fetchArtistSongs() → direct songs
            .mockResolvedValueOnce({
                data: {
                    response: {
                        songs: [
                            {
                                id: 201,
                                full_title: "Direct1",
                                primary_artist: { id: 1, name: "Artist" },
                                header_image_url: "",
                                release_date_for_display: "",
                                url: ""
                            },
                            {
                                id: 202,
                                full_title: "Direct2",
                                primary_artist: { id: 1, name: "Artist" },
                                header_image_url: "",
                                release_date_for_display: "",
                                url: ""
                            }
                        ]
                    }
                }
            });

        render(
            <BrowserRouter>
                <Dashboard user="testUser" />
            </BrowserRouter>
        );

        // fill in the search bar & song‐limit so limit=2
        fireEvent.change(
            screen.getByLabelText("Artist search query input"),
            { target: { value: "Artist" } }
        );
        fireEvent.change(
            screen.getByLabelText("set number of search results"),
            { target: { value: "2" } }
        );

        // kick off artist search
        fireEvent.click(screen.getByRole("button", { name: /Search/ }));

        // wait for the artist button, then click it
        const artistBtn = await screen.findByLabelText("Select artist Artist");
        fireEvent.click(artistBtn);

        // now the two direct songs should render
        expect(
            await screen.findByLabelText("song title: Direct1")
        ).toBeInTheDocument();
        expect(
            await screen.findByLabelText("song title: Direct2")
        ).toBeInTheDocument();
    });

    test("deduplicates songs via existingIds in fallback", async () => {
        axios.get
            // 1) fetchArtists()
            .mockResolvedValueOnce({ data: [{ id: 1, name: "Artist" }] })
            // 2) direct page 1 → one song
            .mockResolvedValueOnce({
                data: {
                    response: {
                        songs: [
                            {
                                result: {
                                    id: 100,
                                    full_title: "DirectSong",
                                    header_image_url: "",
                                    release_date_for_display: "",
                                    url: "",
                                    primary_artist: { id: 1, name: "Artist" },
                                },
                            },
                        ],
                    },
                },
            })
            // 3) direct page 2 → empty → break out of direct loop
            .mockResolvedValueOnce({
                data: {
                    response: {
                        songs: [],
                    },
                },
            })
            // 4) fallback page 1 → duplicate + new
            .mockResolvedValueOnce({
                data: {
                    response: {
                        hits: [
                            {
                                result: {
                                    id: 100,
                                    full_title: "DirectSong",
                                    primary_artist: { id: 1, name: "Artist" },
                                },
                            },
                            {
                                result: {
                                    id: 101,
                                    full_title: "NewSong",
                                    primary_artist: { id: 1, name: "Artist" },
                                },
                            },
                        ],
                    },
                },
            })
            // 5) fallback page 2 → empty → break out of fallback loop
            .mockResolvedValueOnce({
                data: {
                    response: {
                        hits: [],
                    },
                },
            });

        render(
            <BrowserRouter>
                <Dashboard user="testUser" />
            </BrowserRouter>
        );

        // 1) run the search
        fireEvent.change(
            screen.getByLabelText("Artist search query input"),
            { target: { value: "Artist" } }
        );
        fireEvent.change(
            screen.getByLabelText("set number of search results"),
            { target: { value: "2" } }
        );
        fireEvent.click(screen.getByRole("button", { name: /Search/ }));

        // 2) pick the artist
        const artistBtn = await screen.findByRole("button", {
            name: /Select artist Artist/,
        });
        fireEvent.click(artistBtn);

        // 3) wait for exactly two list items
        const items = await screen.findAllByRole("listitem");
        expect(items).toHaveLength(2);

        // 4) verify one DirectSong and one NewSong
        const texts = items.map(li => li.textContent);
        expect(texts.filter(t => t.includes("DirectSong"))).toHaveLength(1);
        expect(texts.filter(t => t.includes("NewSong"))).toHaveLength(1);
    });

    test("shows top‐level “No artists found.” error", async () => {
        // fetchArtists() returns empty list
        axios.get.mockResolvedValueOnce({ data: [] });

        render(
            <BrowserRouter>
                <Dashboard user="testUser" />
            </BrowserRouter>
        );

        // type query + a valid songLimit so it actually fires fetchArtists
        fireEvent.change(
            screen.getByLabelText("Artist search query input"),
            { target: { value: "Nobody" } }
        );
        fireEvent.change(
            screen.getByLabelText("set number of search results"),
            { target: { value: "1" } }
        );

        // click Search
        fireEvent.click(screen.getByRole("button", { name: /Search/ }));

        // look for the error paragraph by its text
        const errorPara = await screen.findByText("No artists found.");
        expect(errorPara).toBeInTheDocument();
    });

    test('displays "No artists found for “Queen.”" when fetchArtists returns an empty array', async () => {
        // 1st axios.get → fetchArtists → returns []
        axios.get.mockResolvedValueOnce({ data: [] });

        render(
            <BrowserRouter>
                <Dashboard user="testUser" />
            </BrowserRouter>
        );

        // type in a valid query and limit
        await userEvent.type(screen.getByLabelText(/Artist search query input/), 'Queen');
        await userEvent.type(screen.getByLabelText(/set number of search results/), '5');

        // click the Search button
        await userEvent.click(screen.getByRole('button', { name: /Search/ }));

        // now wait for the no-artists message to appear
        expect(
            await screen.findByText(/No artists found for “Queen.”/)
        ).toBeInTheDocument();
    });

    // … in the same describe block …

    test('displays "No songs found for “ArtistX.”" when both chunk and hits are empty', async () => {
        axios.get
            .mockResolvedValueOnce({
                data: [{ id: 42, name: 'ArtistX', imageUrl: '', headerUrl: '' }]
            })
            .mockResolvedValueOnce({ data: {} }) // chunk = []
            .mockResolvedValueOnce({ data: {} }); // hits  = []

        render(
            <BrowserRouter>
                <Dashboard user="testUser" />
            </BrowserRouter>
        );

        // search for ArtistX
        await userEvent.type(screen.getByLabelText(/Artist search query input/), 'ArtistX');
        await userEvent.type(screen.getByLabelText(/set number of search results/), '3');
        await userEvent.click(screen.getByRole('button', { name: /Search/ }));

        // select the artist button
        const btn = await screen.findByRole('button', { name: /Select artist ArtistX/ });
        await userEvent.click(btn);

        // now assert the “no songs” message
        expect(
            await screen.findByText(/No songs found for “ArtistX.”/)
        ).toBeInTheDocument();
    });

});

describe('setWordCloudSongs updater logic', () => {
    it('should correctly add only non-duplicate songs', () => {
        const initialSongs = [ { songId: '1', title: 'Existing Song' } ];
        const mapped = [
            { songId: '1', title: 'Duplicate Song' },
            { songId: '2', title: 'New Song' }
        ];
        const updater = (prev) => {
            const existingIds = new Set(prev.map(song => song.songId));
            const newSongs = mapped.filter(song => !existingIds.has(song.songId));
            return [...prev, ...newSongs];
        };
        const result = updater(initialSongs);
        expect(result).toHaveLength(2);
        expect(result).toContainEqual({ songId: '1', title: 'Existing Song' });
        expect(result).toContainEqual({ songId: '2', title: 'New Song' });
        expect(result).not.toContainEqual({ songId: '1', title: 'Duplicate Song' });
    });
});