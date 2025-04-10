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
        if (user) {
            loadWordCloudFromBackend();
        }
    }, [user]);

    const handleLogout = () => {
        localStorage.removeItem("user");
        window.location.reload();
        navigate("/");
    };

    const loadWordCloudFromBackend = async () => {
        try {
            const res = await axios.get(`http://localhost:8080/api/wordcloud/${user}`);
            setWordCloudSongs(res.data);
            setShowWordCloud(true);
        } catch (err) {
            console.error("❌ Failed to load word cloud songs:", err);
        }
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

                // Filter the hits so that only results with a matching artist name remain.
                const filteredHits = hits.filter(hit =>
                    hit.result.primary_artist.name.toLowerCase().includes(query.toLowerCase())
                );

                allResults = [...allResults, ...filteredHits];
                page++;
            }

            // If no matching songs are found, set an error message.
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
                    else {
                        failed.push(song.result.full_title);
                    }
                } catch {
                    failed.push(song.result.full_title);
                }
            }
        }

        setSuccessMessage(added.length > 0 ? `✅ Added: ${added.join(", ")}` : "");
        setErrorMessage(failed.length > 0 ? `⚠️ Already in favorites: ${failed.join(", ")}` : "");
        setIsAddingFavorites(false);
    };
    const addSelectedToWordCloud = async () => {
        setCloudLoading(true); // start loading
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

        try {
            await axios.post("http://localhost:8080/api/wordcloud/add", mapped);

            const updated = await axios.get(`http://localhost:8080/api/wordcloud/${user}`);
            setWordCloudSongs(updated.data);
            setShowWordCloud(true);
        } catch (err) {
            console.error("❌ Failed to save to word cloud:", err);
        } finally {
            setCloudLoading(false); // stop loading
        }
    };

    if (!user) return <Navigate to="/" replace />;

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }} onClick={resetInactivityTimer}>
            <h2>Welcome, {user}!</h2>

            <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
                <div style={{ flex: "2", maxWidth: "500px", textAlign: "left" }}>
                    <h3>🔍 Search for a Song</h3>

                    <input
                        id="song-title"
                        type="text"
                        placeholder="Enter artist name..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
                    />

                    <input
                        id="song-limit"
                        type="number"
                        placeholder="Number of songs to display"
                        value={songLimit}
                        onChange={(e) => setSongLimit(e.target.value)}
                        style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
                    />

                    <button
                        id="search-button"
                        onClick={fetchSongs}
                        style={{ width: "100%", padding: "8px" }}
                    >
                        Search
                    </button>

                    <button
                        id="add-to-favorites"
                        onClick={bulkAddToFavorites}
                        disabled={isAddingFavorites}
                        style={{
                            width: "100%",
                            padding: "8px",
                            marginTop: "10px",
                            backgroundColor: "#4CAF50",
                            color: "white",
                            opacity: isAddingFavorites ? 0.6 : 1,
                            cursor: isAddingFavorites ? "not-allowed" : "pointer"
                        }}
                    >
                        {isAddingFavorites ? "Adding..." : "Add Selected to Favorites"}
                    </button>

                    <button
                        id="add-to-wordcloud"
                        onClick={addSelectedToWordCloud}
                        style={{
                            width: "100%",
                            padding: "8px",
                            marginTop: "10px",
                            backgroundColor: "#f57c00",
                            color: "white"
                        }}
                    >
                        Add Selected to Word Cloud
                    </button>

                    {successMessage && <p id="search-success" style={{ color: "green", marginTop: "10px" }}>{successMessage}</p>}
                    {errorMessage && <p id="search-error" style={{ color: "red" }}>{errorMessage}</p>}

                    <h3 style={{ marginTop: "20px" }}>🎶 Search Results</h3>

                    {songs.length > 0 ? (
                        <ul id="results-list" style={{ listStyleType: "none", padding: 0 }}>
                            {songs.map((song) => (
                                <li key={song.result.id} style={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedSongs.includes(song.result.id)}
                                        onChange={() => toggleSelectSong(song.result.id)}
                                        style={{ marginRight: "10px" }}
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
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                        <span id="song-name" style={{ fontWeight: "bold", cursor: "pointer" }}>🎵 {song.result.full_title}</span>
                                        <span style={{ fontSize: "12px", color: "gray" }}>
                                            📅 {song.result.release_date_for_display}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p style={{ fontStyle: "italic", color: "gray" }}>No songs found.</p>
                    )}
                </div>
            </div>

            {showWordCloud && (
                <div id="word-cloud" style={{ marginTop: "40px" }}>
                    <WordCloudPanel wordCloudSongs={wordCloudSongs} user={user} loading={cloudLoading} />
                </div>
            )}
        </div>
    );
};

export default Dashboard;