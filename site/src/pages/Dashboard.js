import React, { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import WordCloudPanel from "./WordCloudPanel";

const Dashboard = ({ user }) => {
    const navigate = useNavigate();

    const [query, setQuery] = useState("");
    const [songs, setSongs] = useState([]);
    const [artists, setArtists] = useState([]);
    const [selectedArtist, setSelectedArtist] = useState(null);
    const [selectedSongs, setSelectedSongs] = useState([]);
    const [searching, setSearching] = useState(false);

    const [wordCloudSongs, setWordCloudSongs] = useState([]);

    const [songLimit, setSongLimit] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const [isAddingFavorites, setIsAddingFavorites] = useState(false);
    const [isAddingFavoritesToCloud, setIsAddingFavoritesToCloud] = useState(false);

    const [lastActivity, setLastActivity] = useState(Date.now());
    const resetInactivityTimer = () => setLastActivity(Date.now());
    const [cloudLoading, setCloudLoading] = useState(false);

    useEffect(() => {
        if (!user) return;

        const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
        events.forEach(event => window.addEventListener(event, resetInactivityTimer));

        const inactivityInterval = setInterval(() => {
            if (Date.now() - lastActivity > 60000) {
                handleLogout();
                clearInterval(inactivityInterval);
            }
        }, 1000);

        return () => {
            events.forEach(event => window.removeEventListener(event, resetInactivityTimer));
            clearInterval(inactivityInterval);
        };
    }, [user, lastActivity]);

    const handleLogout = () => {
        localStorage.removeItem("user");
        window.location.reload();
        navigate("/");
    };

    const fetchArtists = async () => {
        setSearching(true);

        // basic guards
        if (!query.trim())           return alert("Please enter an artist name!");
        if (!songLimit || isNaN(songLimit) || +songLimit <= 0) {
            setSearching(false);
            return alert("Please enter a valid number of songs to display.");
        }

        try {
            const res = await axios.get("https://localhost:8080/api/genius/artists", {
                params: { q: query }
            });
            const list = res.data;

            if (list.length === 0) {
                setArtists([]); setSongs([]);
                setSongs([]);
                setErrorMessage("No artists found.");
                setSuccessMessage("");
                setSearching(false);
                return;
            }
            setArtists(list);
            setSongs([]);
            setSelectedArtist(null);
            setSelectedSongs([]);
            setSuccessMessage(""); setErrorMessage("");
        } catch (err) {
            console.error(err);
            setErrorMessage("Artist search failed. Try again."); setSuccessMessage("");
        }

        setSearching(false);
    };

    async function fetchArtistSongs(artist) {
        setSearching(true);
        setSelectedArtist(artist);
        setArtists([]);
        setSongs([]);
        setSelectedSongs([]);
        setSuccessMessage(""); setErrorMessage("");

        const limit = +songLimit;
        let collected = [];
        let page = 1;

        while (collected.length < limit) {
            const { data } = await axios.get(
                `https://localhost:8080/api/genius/artists/${artist.id}/songs`,
                { params: { page } }
            );
            const chunk = data.response?.songs ?? [];
            if (chunk.length === 0) break;          // ran out
            collected.push(...chunk.map(normalizeSong));
            page++;
        }

        if (collected.length < limit) {
            page = 1;
            while (collected.length < limit) {
                const { data } = await axios.get("https://localhost:8080/api/genius/search", {
                    params: { q: artist.name, page }
                });
                const hits = data.response?.hits ?? [];
                if (hits.length === 0) break;

                const newSongs = hits.map(normalizeSong);

                const existingIds = new Set(collected.map(s => s.result.id));
                newSongs.forEach(s => {
                    if (!existingIds.has(s.result.id)) {
                        collected.push(s);
                    }
                });

                page++;
            }
        }

        // try filtering by primary artist, but fall back to whatever we fetched
        const filteredByPrimary = collected.filter(s =>
            s.result.primary_artist?.id === artist.id &&
            s.result.primary_artist?.name.toLowerCase().includes(artist.name.toLowerCase())
        );

        const songsToShow = filteredByPrimary.length > 0 ? filteredByPrimary : collected;
        setSongs(songsToShow.slice(0, limit));
        setSearching(false);
    }

    function normalizeSong(obj) {
        const s = obj.result || obj;
        return { result: s };
    }

    const toggleSelectSong = (songId) => {
        setSelectedSongs(prev =>
            prev.includes(songId) ? prev.filter(id => id !== songId) : [...prev, songId]
        );
    };

    const bulkAddToFavorites = async () => {
        if (selectedSongs.length === 0) {
            alert("Please select at least one song to add.");
            return;
        }

        setIsAddingFavorites(true);
        let added = [], failed = [];
        for (const song of songs) {
            if (selectedSongs.includes(song.result.id)) {
                let lyrics = "Unknown";

                try {
                    const lyricsRes = await axios.get(`https://localhost:8080/api/genius/lyrics`, {
                        params: { songId: song.result.id }
                    });
                    lyrics = lyricsRes.data.lyrics;
                } catch (err) {
                    console.warn(`Failed to get lyrics for ${song.result.full_title}`);
                }

                const favoriteSong = {
                    username: user,
                    songId: song.result.id,
                    title: song.result.full_title,
                    url: song.result.url,
                    imageUrl: song.result.header_image_url,
                    releaseDate: song.result.release_date_for_display,
                    artistName: song.result.primary_artist?.name,
                    lyrics
                };

                try {
                    const res = await axios.post("https://localhost:8080/api/favorites/add", favoriteSong);
                    if (res.status === 200) added.push(song.result.full_title);
                    else failed.push(song.result.full_title);
                } catch {
                    failed.push(song.result.full_title);
                }

            } else {
                // Else path for testing
                console.info(`Skipping song not in selected list: ${song.result.full_title}`);
            }
        }


        setSuccessMessage(added.length > 0 ? `✅ Added: ${added.join(", ")}` : "");
        setErrorMessage(failed.length > 0 ? `⚠️ Already in favorites: ${failed.join(", ")}` : "");
        setIsAddingFavorites(false);
    };

    const addFavoritesToWordCloud = async () => {
        setCloudLoading(true);
        setIsAddingFavoritesToCloud(true);

        const response = await axios.get(`https://localhost:8080/api/favorites/${user}`);
        const favorites = response.data;

        if (!favorites || favorites.length === 0) {
            setSuccessMessage("");
            setErrorMessage("No favorites found.");
            setIsAddingFavoritesToCloud(false);
            setCloudLoading(false);
            return;
        }

        setSuccessMessage("");
        setErrorMessage("");

        const mapped = [];
        for (const song of favorites) {
            let lyrics = "Unknown";

            try {
                const lyricsRes = await axios.get(`https://localhost:8080/api/genius/lyrics`, {
                    params: { songId: song.songId }
                });
                lyrics = lyricsRes.data.lyrics;
            } catch (err) {
                console.warn(`Failed to get lyrics for ${song.title}`);
            }

            mapped.push({
                username: user,
                songId: song.songId,
                title: song.title,
                url: song.url,
                imageUrl: song.imageUrl,
                releaseDate: song.releaseDate,
                artistName: song.artistName,
                lyrics
            });
        }

        setWordCloudSongs(mapped);
        setCloudLoading(false);
        setIsAddingFavoritesToCloud(false);
    };

    const addSelectedToWordCloud = async () => {
        if (selectedSongs.length === 0) {
            alert("Please select at least one song to add to the word cloud.");
            setCloudLoading(false);
            return;
        }

        setCloudLoading(true);
        const selected = songs.filter(song => selectedSongs.includes(song.result.id));
        const mapped = [];

        for (const song of selected) {
            let lyrics = "Unknown";

            try {
                const lyricsRes = await axios.get(`https://localhost:8080/api/genius/lyrics`, {
                    params: { songId: song.result.id }
                });
                lyrics = lyricsRes.data.lyrics;
            } catch (err) {
                console.warn(`Failed to get lyrics for ${song.result.full_title}`);
            }

            mapped.push({
                username: user,
                songId: song.result.id,
                title: song.result.full_title,
                url: song.result.url,
                imageUrl: song.result.header_image_url,
                releaseDate: song.result.release_date_for_display,
                artistName: song.result.primary_artist?.name,
                lyrics
            });
        }

        setWordCloudSongs(prev => mergeWordCloudSongs(prev, mapped));

        setCloudLoading(false);
    };

    if (!user) return <Navigate to="/" replace />;

    return (
        <div onClick={resetInactivityTimer} className="@container flex-1 px-4 py-12 bg-[#d0c2dc]">
            <div className="max-w-4xl mx-auto space-y-8">
                <h2 aria-label={`Welcome, ${user}`} className="text-3xl font-bold text-center text-[#3d3547] mb-8">Welcome, {user}!</h2>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-grow">
                            <label aria-label={`label for song search`} htmlFor="artist-title" className="block text-sm font-medium text-gray-700 mb-1">
                                Search songs
                            </label>

                            <div className="relative">
                                <span aria-label={`Search query icon magnifying glass`} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                                <input
                                    aria-label={`Artist search query input`}
                                    id="artist-title"
                                    type="search"
                                    placeholder="Enter artist name..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none
                                focus:ring-2 focus:ring-purple-300 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col justify-end">
                            <label aria-label={`label: number of search results`} htmlFor="song-limit" className="block text-xs font-medium text-gray-700 mb-1">
                                Number of results
                            </label>
                            <div className="relative flex items-center">
                                <input
                                    aria-label={`set number of search results`}
                                    id="song-limit"
                                    type="number"
                                    min="1"
                                    placeholder="#"
                                    value={songLimit}
                                    onChange={(e) => setSongLimit(e.target.value)}
                                    className="w-32 py-3 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col justify-end">
                            <label aria-label={`padding space`} className="block text-sm font-medium text-transparent mb-1">&nbsp;</label>
                            <button
                                id="search-button"
                                onClick={fetchArtists}
                                disabled={searching}
                                aria-busy={searching}
                                aria-label={searching ? "Searching…" : "Search"}
                                className="bg-purple-500 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-md transition duration-300 ease-in-out flex items-center justify-center shadow-sm"
                            >
                                {searching ? "Searching…" : "Search"}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 aria-label={`header for search result section`} className="text-xl font-semibold mb-4">Search Results</h2>
                    <div className="flex flex-col sm:flex-row justify-center gap-2 my-6">
                        <button
                            aria-label={`add selected to favorites`}
                            id="add-to-favorites"
                            onClick={bulkAddToFavorites}
                            disabled={isAddingFavorites}
                            className="bg-[#4caf50] hover:bg-green-700 text-gray-100 font-medium py-2 px-4 rounded-md transition duration-300 ease-in-out border border-gray-300"
                            style={{
                                opacity: isAddingFavorites ? 0.6 : 1,
                                cursor: isAddingFavorites ? "not-allowed" : "pointer"
                            }}
                        >
                            {isAddingFavorites ? "Adding..." : "Add Selected to Favorites"}
                        </button>
                        <button
                            id="add-to-wordcloud"
                            onClick={addSelectedToWordCloud}
                            aria-label={`add selected to word cloud`}
                            className="bg-[#f57c00] hover:bg-orange-700 text-gray-100 font-medium py-2 px-4 rounded-md transition duration-300 ease-in-out border border-gray-300"
                        >
                            Add Selected to Word Cloud
                        </button>
                        <button
                            id="add-all-favorites"
                            onClick={addFavoritesToWordCloud}
                            aria-label={`add all favorites to word cloud`}
                            className="bg-[#8c5ad0] hover:bg-purple-700 text-gray-100 font-medium py-2 px-4 rounded-md transition duration-300 ease-in-out border border-gray-300"
                        >
                            {isAddingFavoritesToCloud ? "Adding..." : "Add All Favorites to Word Cloud"}
                        </button>
                    </div>
                    {successMessage &&
                        <p aria-label={`success message: ${successMessage}`} id="search-success" style={{color: "green", marginTop: "10px"}}>{successMessage}</p>}
                    {errorMessage && <p aria-label={`error message: ${errorMessage}`} id="search-error" style={{color: "red"}}>{errorMessage}</p>}

                    {artists.length > 0 && !searching && (
                        <div className="bg-white p-6 rounded-lg shadow-md"
                             aria-label="artist-results">
                            <h2 className="text-xl font-semibold mb-4"
                                aria-label={`header for artist selection section`}
                            >

                                Select an artist
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3"
                                 aria-label="Artist selection grid"
                                 id = "artist-selection"
                            >
                                {artists.map(a => (
                                    <button key={a.id}
                                            id={`artist-${a.name}`}
                                            aria-label={`Select artist ${a.name}`}
                                            onClick={() => fetchArtistSongs(a)}
                                            className="flex flex-col items-center p-4 border rounded-lg hover:shadow-md transition">
                                        <img src={a.imageUrl || a.headerUrl}
                                             alt={`${a.name} portrait`} className="w-24 h-24 rounded-full object-cover mb-2"/>
                                        <span className="font-medium"
                                              aria-label={`Artist name ${a.name}`}
                                        >{a.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {songs.length > 0 && selectedArtist && !searching && (
                        <div>
                            <p aria-label={`Showing up to ${songLimit} results for ${query}`} className="text-center text-gray-500">{`Showing up to ${songLimit} results for "${query}"`}</p>
                            <ul id="results-list" style={{listStyleType: "none", padding: 0}}>
                                {songs.map((song) => (
                                    <li key={song.result.id}
                                        style={{marginBottom: "10px", display: "flex", alignItems: "center"}}>
                                        <input
                                            aria-label={`select song checkbox`}
                                            type="checkbox"
                                            checked={selectedSongs.includes(song.result.id)}
                                            onChange={() => toggleSelectSong(song.result.id)}
                                            style={{marginRight: "10px"}}
                                        />
                                        <img
                                            src={song.result.header_image_url}
                                            alt={`Song Cover for ${song.result.full_title}`}
                                            style={{
                                                width: "50px",
                                                height: "50px",
                                                marginRight: "10px",
                                                borderRadius: "5px"
                                            }}
                                        />
                                        <div style={{display: "flex", flexDirection: "column"}}>
                                        <span aria-label={`song title: ${song.result.full_title}`} id="song-name" style={{fontWeight: "bold", cursor: "pointer"}}>
                                            🎵 {song.result.full_title}
                                        </span>
                                            <span aria-label={`release date: ${song.result.release_date_for_display}`} style={{fontSize: "12px", color: "gray"}}>
                                            📅 {song.result.release_date_for_display}
                                        </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {!searching && selectedArtist && songs.length === 0 && (
                        <p role="alert" className="text-center text-gray-500">
                            No songs found for “{selectedArtist.name}.”
                        </p>
                    )}

                    {!searching && artists.length === 0 && query.trim() && !selectedArtist && errorMessage === "No artists found." && (
                        <p role="alert" className="text-center text-gray-500">
                            No artists found for “{query}.”
                        </p>
                    )}

                    {searching && (
                        <div className="flex justify-center">
                            <svg aria-label={`loading spinner`} className="animate-spin h-8 w-8 text-purple-500" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" stroke="currentColor" fill="none"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 1 1 16 0A8 8 0 0 1 4 12zm2.5 0a5.5 5.5 0 1 0 11 0A5.5 5.5 0 0 0 6.5 12z"/>
                            </svg>
                        </div>
                    )}

                </div>
                <div id="word-cloud" className="bg-white p-6 rounded-lg shadow-md">
                    <WordCloudPanel wordCloudSongs={wordCloudSongs} user={user} loading={cloudLoading}/>
                </div>

            </div>
        </div>

    );
};

export function mergeWordCloudSongs(prev, incoming) {
    const existingIds = new Set(prev.map(song => song.songId));
    const newSongs = incoming.filter(song => !existingIds.has(song.songId));
    return [...prev, ...newSongs];
}

export default Dashboard;