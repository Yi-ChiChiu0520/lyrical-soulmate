import React, { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import WordCloudPanel from "./WordCloudPanel";

const Dashboard = ({ user }) => {
    const navigate = useNavigate();

    const [query, setQuery] = useState("");
    const [songs, setSongs] = useState([]);
    const [selectedSongs, setSelectedSongs] = useState([]);
    const [wordCloudSongs, setWordCloudSongs] = useState([]);

    const [songLimit, setSongLimit] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [showWordCloud, setShowWordCloud] = useState(false);

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

    useEffect(() => {
        setShowWordCloud(wordCloudSongs.length > 0);
    }, [wordCloudSongs]);

    const handleLogout = () => {
        localStorage.removeItem("user");
        window.location.reload();
        navigate("/");
    };


    const fetchSongs = async () => {
        if (!query.trim()) return alert("Please enter an artist name!");
        if (!songLimit || isNaN(songLimit) || parseInt(songLimit) <= 0) {
            return alert("Please enter a valid number of songs to display.");
        }

        try {
            let allResults = [];
            let page = 1;

            while (allResults.length < parseInt(songLimit)) {
                const response = await axios.get("http://localhost:8080/api/genius/search", {
                    params: { q: query, page }
                });

                const hits = response.data.response.hits;
                if (hits.length === 0) break;

                const filteredHits = hits.filter(hit =>
                    hit.result.primary_artist.name.toLowerCase().includes(query.toLowerCase())
                );

                allResults = [...allResults, ...filteredHits];
                page++;
            }

            if (allResults.length === 0) {
                setSongs([]);
                setErrorMessage("No matches found for your search query.");
                setSuccessMessage("");
                return;
            }

            setSongs(allResults.slice(0, parseInt(songLimit)));
            setSelectedSongs([]);
            setSuccessMessage("");
            setErrorMessage("");
        } catch (error) {
            console.error("Error fetching songs:", error);
            setErrorMessage("An error occurred while fetching songs. Please try again later.");
        }
    };

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
                    const lyricsRes = await axios.get(`http://localhost:8080/api/genius/lyrics`, {
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
                    const res = await axios.post("http://localhost:8080/api/favorites/add", favoriteSong);
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

        const response = await axios.get(`http://localhost:8080/api/favorites/${user}`);
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
                const lyricsRes = await axios.get(`http://localhost:8080/api/genius/lyrics`, {
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
        setShowWordCloud(true);
        setCloudLoading(false);
        setIsAddingFavoritesToCloud(false);
    };

    const addSelectedToWordCloud = async () => {
        setCloudLoading(true);
        const selected = songs.filter(song => selectedSongs.includes(song.result.id));
        const mapped = [];

        for (const song of selected) {
            let lyrics = "Unknown";

            try {
                const lyricsRes = await axios.get(`http://localhost:8080/api/genius/lyrics`, {
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
        setWordCloudSongs(mapped);
        setShowWordCloud(true);
        setCloudLoading(false);
    };

    if (!user) return <Navigate to="/" replace />;

    return (
        <div onClick={resetInactivityTimer} className="@container flex-1 px-4 py-12 bg-[#d0c2dc]">
            <div className="max-w-4xl mx-auto space-y-8">
                <h2 className="text-3xl font-bold text-center text-[#3d3547] mb-8">Welcome, {user}!</h2>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-grow">
                            <label htmlFor="songSearch" className="block text-sm font-medium text-gray-700 mb-1">
                                Search songs
                            </label>

                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                                <input
                                    id="song-title"
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
                            <label htmlFor="resultCount" className="block text-xs font-medium text-gray-700 mb-1">
                                Number of results
                            </label>
                            <div className="relative flex items-center">
                                <input
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
                            <label className="block text-sm font-medium text-transparent mb-1">&nbsp;</label>
                            <button
                                id="search-button"
                                onClick={fetchSongs}
                                className="bg-purple-500 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-md transition duration-300 ease-in-out flex items-center justify-center shadow-sm"
                            >
                                Search
                            </button>
                        </div>
                    </div>


                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Search Results</h2>
                    <div className="flex flex-col sm:flex-row justify-center gap-2 my-6">
                        <button
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
                            className="bg-[#f57c00] hover:bg-orange-700 text-gray-100 font-medium py-2 px-4 rounded-md transition duration-300 ease-in-out border border-gray-300"
                        >
                            Add Selected to Word Cloud
                        </button>
                        <button
                            id="add-all-favorites"
                            onClick={addFavoritesToWordCloud}
                            className="bg-[#8c5ad0] hover:bg-purple-700 text-gray-100 font-medium py-2 px-4 rounded-md transition duration-300 ease-in-out border border-gray-300"
                        >
                            {isAddingFavoritesToCloud ? "Adding..." : "Add All Favorites to Word Cloud"}
                        </button>
                    </div>
                    {successMessage &&
                        <p id="search-success" style={{color: "green", marginTop: "10px"}}>{successMessage}</p>}
                    {errorMessage && <p id="search-error" style={{color: "red"}}>{errorMessage}</p>}
                    {songs.length > 0 ? (
                        <div>
                            <p className="text-center text-gray-500">{`Showing up to ${songLimit} results for "${query}"`}</p>
                            <ul id="results-list" style={{listStyleType: "none", padding: 0}}>
                                {songs.map((song) => (
                                    <li key={song.result.id}
                                        style={{marginBottom: "10px", display: "flex", alignItems: "center"}}>
                                        <input
                                            type="checkbox"
                                            checked={selectedSongs.includes(song.result.id)}
                                            onChange={() => toggleSelectSong(song.result.id)}
                                            style={{marginRight: "10px"}}
                                        />
                                        <img
                                            src={song.result.header_image_url}
                                            alt="Song Cover"
                                            style={{
                                                width: "50px",
                                                height: "50px",
                                                marginRight: "10px",
                                                borderRadius: "5px"
                                            }}
                                        />
                                        <div style={{display: "flex", flexDirection: "column"}}>
                                        <span id="song-name" style={{fontWeight: "bold", cursor: "pointer"}}>
                                            🎵 {song.result.full_title}
                                        </span>
                                            <span style={{fontSize: "12px", color: "gray"}}>
                                            📅 {song.result.release_date_for_display}
                                        </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500">No songs found.</p>
                    )}
                </div>
                <div id="word-cloud" className="bg-white p-6 rounded-lg shadow-md">
                    <WordCloudPanel wordCloudSongs={wordCloudSongs} user={user} loading={cloudLoading}/>
                </div>

            </div>
        </div>

    );
};

export default Dashboard;
