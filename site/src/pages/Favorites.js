// Favorites.js
import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import WordCloudPanel from "./WordCloudPanel";

const Favorites = ({ user }) => {
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState([]);
    const [selectedFavorites, setSelectedFavorites] = useState([]);
    const [expandedSong, setExpandedSong] = useState(null);
    const [lastActivity, setLastActivity] = useState(Date.now());
    const [showWordCloud, setShowWordCloud] = useState(false);

    const resetInactivityTimer = () => setLastActivity(Date.now());

    useEffect(() => {
        if (!user) return;

        fetchFavorites();

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
        logoutAndRedirect(navigate);
    };

    const logoutAndRedirect = (navigate) => {
        localStorage.removeItem("user");
        window.location.reload(); // force full reload to reset app state/UI
        navigate("/"); // ensure navigation happens
    };


    const fetchFavorites = async () => {
        try {
            const response = await axios.get(`http://localhost:8080/api/favorites/${user}`);
            const filtered = (response.data || []).filter(song => song && song.songId);
            setFavorites(filtered);
        } catch (error) {
            console.error("Error fetching favorites:", error);
            setFavorites([]);
        }
    };

    const toggleSelectFavorite = (songId) => {
        setSelectedFavorites(prev =>
            prev.includes(songId) ? prev.filter(id => id !== songId) : [...prev, songId]
        );
    };

    const removeFromFavorites = async (songId) => {
        try {
            await axios.delete(`http://localhost:8080/api/favorites/remove/${user}/${songId}`);
            setFavorites([]);
            await fetchFavorites();
            resetInactivityTimer();
        } catch (error) {
            console.error("Error removing from favorites:", error);
        }
    };

    const moveFavorite = async (index, direction) => {
        const newIndex = direction === "up" ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= favorites.length) return;

        try {
            await axios.post(`http://localhost:8080/api/favorites/swap`, null, {
                params: {
                    username: user,
                    rank1: favorites[index].rank,
                    rank2: favorites[newIndex].rank
                }
            });
            fetchFavorites();
            resetInactivityTimer();
        } catch (error) {
            console.error("Error swapping ranks:", error);
        }
    };
    const handleAddToWordCloud = async () => {
        const selectedSongs = favorites.filter(song => selectedFavorites.includes(song.songId));

        try {
            await axios.post("http://localhost:8080/api/wordcloud/add", selectedSongs);
            alert("✅ Selected songs added to your Word Cloud!");
            setSelectedFavorites([]); // Optional: clear selection
        } catch (error) {
            console.error("❌ Failed to add to word cloud:", error);
            alert("❌ Failed to add songs to Word Cloud.");
        }
    };


    if (!user) return <Navigate to="/" replace />;

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }} onClick={resetInactivityTimer}>
            <h2 id="favorites-header">💖 {user}'s Favorite Songs</h2>

            {favorites.length > 0 ? (
                <>
                    <ul id="favorites-list" style={{ listStyleType: "none", padding: 0 }}>
                        {favorites.map((song, index) => (
                            <li id={song.title.replace(/\s/g, '').replace(/[\s\u00A0]/g, '').replace(/[^a-zA-Z0-9_-]/g, '')} key={song.songId} style={{ marginBottom: "20px", cursor: "pointer" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedFavorites.includes(song.songId)}
                                        onChange={() => toggleSelectFavorite(song.songId)}
                                        style={{ marginRight: "10px" }}
                                    />
                                    <img src={song.imageUrl} alt="cover" style={{ width: "50px", height: "50px", borderRadius: "5px", marginRight: "10px" }} />
                                    <span id="song-title" onClick={() => setExpandedSong(expandedSong === song.songId ? null : song.songId)}>
                                        🎵 <strong>{song.title}</strong>
                                    </span>
                                </div>

                                {expandedSong === song.songId && (
                                    <div style={{ marginTop: "5px", fontSize: "14px", color: "gray" }}>
                                        <p id="artist-name"><strong>🎤 Artist:</strong> {song.artistName}</p>
                                        <p id="release-date"><strong>📅 Release Date:</strong> {song.releaseDate}</p>
                                    </div>
                                )}

                                <div style={{ marginTop: "5px" }}>
                                    <button id="remove-favorite" onClick={() => removeFromFavorites(song.songId)} style={{ marginRight: "5px", padding: "5px", color: "red" }}>❌ Remove</button>
                                    <button id="move-up" onClick={() => moveFavorite(index, "up")} style={{ marginRight: "5px", padding: "5px" }}>⬆️</button>
                                    <button id="move-down" onClick={() => moveFavorite(index, "down")} style={{ padding: "5px" }}>⬇️</button>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <button
                        onClick={handleAddToWordCloud}
                        disabled={selectedFavorites.length === 0}
                        style={{
                            marginTop: "20px",
                            padding: "10px",
                            backgroundColor: "#f57c00",
                            color: "white",
                            border: "none",
                            cursor: selectedFavorites.length === 0 ? "not-allowed" : "pointer",
                            opacity: selectedFavorites.length === 0 ? 0.6 : 1
                        }}
                    >
                        Add Selected to Word Cloud
                    </button>

                </>
            ) : (
                <p style={{fontStyle: "italic", color: "gray"}}>No favorite songs yet.</p>
            )}

            {/*{Array.isArray(showWordCloud) && showWordCloud.length > 0 && (*/}
            {/*    <div style={{marginTop: "40px"}}>*/}
            {/*        <WordCloudPanel wordCloudSongs={showWordCloud} user={user}/>*/}
            {/*    </div>*/}
            {/*)}*/}
        </div>
    );
};

export default Favorites;
