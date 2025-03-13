import React, { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import axios from "axios";

const Dashboard = () => {
    const user = localStorage.getItem("user");
    const navigate = useNavigate();

    if (!user) return <Navigate to="/" />;

    const handleLogout = () => {
        localStorage.removeItem("user");
        navigate("/");
    };

    const [query, setQuery] = useState("");
    const [songs, setSongs] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [expandedSong, setExpandedSong] = useState(null);

    // Fetch favorite songs on load
    useEffect(() => {
        fetchFavorites();
    }, []);

    // Fetch songs from Genius API via backend
    const fetchSongs = async () => {
        if (!query.trim()) {
            alert("Please enter a song title!");
            return;
        }

        try {
            const response = await axios.get("http://localhost:8080/api/genius/search", {
                params: { q: query }
            });

            setSongs(response.data.response.hits);
        } catch (error) {
            console.error("Error fetching songs:", error);
        }
    };

    // Fetch user's favorite songs
    const fetchFavorites = async () => {
        try {
            const response = await axios.get(`http://localhost:8080/api/favorites/${user}`);
            const updatedFavorites = response.data.map(song => ({
                ...song,
                rank: song.rank > 0 ? song.rank : 1  // ✅ Ensure rank is never negative
            }));

            console.log("📥 Updated Favorites from backend:", updatedFavorites);
            setFavorites(updatedFavorites);
        } catch (error) {
            console.error("Error fetching favorites:", error);
        }
    };

    // Add a song to favorites (now includes song image)
    const addToFavorites = async (song) => {
        try {
            const favoriteSong = {
                username: user,
                songId: song.result.id,
                title: song.result.full_title,
                url: song.result.url,
                imageUrl: song.result.header_image_url,
                releaseDate: song.result.release_date || song.result.release_date_for_display || "Unknown",
                artistName: song.result.primary_artist?.name || "Unknown" // ✅ Store artist name
            };

            await axios.post("http://localhost:8080/api/favorites/add", favoriteSong);
            await fetchFavorites(); // Refresh favorites after adding
        } catch (error) {
            console.error("Error adding to favorites:", error);
        }
    };

    const removeFromFavorites = async (songId) => {
        try {
            console.log("Attempting to remove song:", songId); // Debugging log

            await axios.delete(`http://localhost:8080/api/favorites/remove/${user}/${songId}`);

            console.log("✅ Song removed successfully!");

            setFavorites((prevFavorites) => prevFavorites.filter(song => song.songId !== songId));

        } catch (error) {
            console.error("❌ Error removing from favorites:", error.response ? error.response.data : error.message);
        }
    };

    const moveFavorite = async (currentIndex, direction) => {
        if (direction === "up" && currentIndex === 0) return;
        if (direction === "down" && currentIndex === favorites.length - 1) return;

        await fetchFavorites(); // ✅ Ensure we have the latest ranks from the backend

        const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
        const updatedFavorites = [...favorites];  // ✅ Ensure we work with the latest ranks
        const song1 = updatedFavorites[currentIndex];
        const song2 = updatedFavorites[newIndex];

        console.log(`📡 Attempting to swap: ${song1.title} (Rank: ${song1.rank}) ↔ ${song2.title} (Rank: ${song2.rank})`);

        if (song1.rank === undefined || song2.rank === undefined) {
            console.error("❌ Error: Rank is undefined for one or both songs!");
            return;
        }

        try {
            await axios.post(`http://localhost:8080/api/favorites/swap`, null, {
                params: {
                    username: user,
                    rank1: song1.rank,
                    rank2: song2.rank,
                },
            });

            console.log("✅ Swap successful!");
            await fetchFavorites(); // ✅ Ensure UI updates immediately
        } catch (error) {
            console.error("❌ Error swapping ranks:", error.response ? error.response.data : error.message);
        }
    };

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h2>Welcome, {user}!</h2>
            <button onClick={handleLogout} style={{ marginBottom: "20px" }}>Logout</button>

            {/* Flex container for search and favorites sections */}
            <div style={{display: "flex", justifyContent: "center", gap: "40px", marginTop: "20px"}}>

                {/* Left Panel: Search & Search Results */}
                <div style={{flex: "2", maxWidth: "500px", textAlign: "left"}}>
                    <h3>🔍 Search for a Song</h3>
                    <input
                        type="text"
                        placeholder="Enter song title..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        style={{width: "100%", padding: "8px", marginBottom: "10px"}}
                    />
                    <button onClick={fetchSongs} style={{width: "100%", padding: "8px"}}>Search</button>

                    <h3 style={{marginTop: "20px"}}>🎶 Search Results</h3>
                    {songs.length > 0 ? (
                        <ul style={{listStyleType: "none", padding: 0}}>
                            {songs.map((song) => (
                                <li key={song.result.id}
                                    style={{marginBottom: "10px", display: "flex", alignItems: "center"}}>
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
                                        <span style={{fontWeight: "bold", cursor: "pointer"}}>
                                            🎵 {song.result.full_title}
                                        </span>
                                        <span style={{fontSize: "12px", color: "gray"}}>
                                            📅 Release Date: {song.result.release_date || song.result.release_date_for_display || "Unknown"}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => addToFavorites(song)}
                                        style={{marginLeft: "10px", padding: "5px", cursor: "pointer"}}
                                    >
                                        ⭐ Add to Favorites
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p style={{fontStyle: "italic", color: "gray"}}>No songs found.</p>
                    )}

                </div>
                <div style={{flex: "1", maxWidth: "300px", textAlign: "left"}}>
                    <h3>💖 Your Favorite Songs</h3>
                    {favorites.length > 0 ? (
                        <ul style={{listStyleType: "none", padding: 0}}>
                            {favorites.map((song, index) => (
                                <li key={song.songId} style={{marginBottom: "10px", cursor: "pointer"}}>
                                    <div
                                        style={{display: "flex", alignItems: "center", cursor: "pointer"}}
                                        onClick={() => setExpandedSong(expandedSong === song.songId ? null : song.songId)}
                                    >
                                        <img
                                            src={song.imageUrl}
                                            alt="Song Cover"
                                            style={{
                                                width: "50px",
                                                height: "50px",
                                                marginRight: "10px",
                                                borderRadius: "5px"
                                            }}
                                        />
                                        <span style={{fontWeight: "bold"}}>🎵 {song.title}</span>
                                    </div>

                                    {/* Show Details Only If This Song is Clicked */}
                                    {expandedSong === song.songId && (
                                        <div style={{
                                            marginLeft: "60px",
                                            marginTop: "5px",
                                            fontSize: "14px",
                                            color: "gray"
                                        }}>
                                            <p><strong>🎤 Artist:</strong> {song.artistName || "Unknown"}</p>
                                            <p><strong>📅 Release Date:</strong> {song.releaseDate || "Unknown"}</p>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => removeFromFavorites(song.songId)}
                                        style={{marginLeft: "10px", padding: "5px", cursor: "pointer", color: "red"}}
                                    >
                                        ❌ Remove
                                    </button>
                                    <button
                                        onClick={() => moveFavorite(index, "up")}
                                        style={{marginLeft: "5px", padding: "5px", cursor: "pointer"}}
                                    >
                                        ⬆️
                                    </button>
                                    <button
                                        onClick={() => moveFavorite(index, "down")}
                                        style={{marginLeft: "5px", padding: "5px", cursor: "pointer"}}
                                    >
                                        ⬇️
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p style={{fontStyle: "italic", color: "gray"}}>No favorite songs yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;