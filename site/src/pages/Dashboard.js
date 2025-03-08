import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom"; // Add useNavigate
import axios from "axios";

const Dashboard = () => {
    const user = localStorage.getItem("user");
    const navigate = useNavigate(); // Use useNavigate for redirection

    if (!user) return <Navigate to="/" />;

    const handleLogout = () => {
        localStorage.removeItem("user");
        navigate("/"); // Use navigate instead of window.location.href
    };

    const [query, setQuery] = useState("");
    const [songs, setSongs] = useState([]);

    const fetchSongs = async () => {
        if (!query.trim()) {
            alert("Please enter a song title!");
            return;
        }

        try {
            // Use backend proxy instead of Genius API directly
            const response = await axios.get(`http://localhost:8080/api/genius/search`, {
                params: { q: query }
            });

            setSongs(response.data.response.hits);
        } catch (error) {
            console.error("Error fetching songs:", error);
        }
    };

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h2>Welcome, {user}!</h2>
            <button onClick={handleLogout}>Logout</button>

            {/* Search Bar */}
            <div style={{ marginTop: "20px" }}>
                <input
                    type="text"
                    placeholder="Search for a song..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button onClick={fetchSongs}>Search</button>
            </div>

            {/* Display Search Results */}
            <div style={{ marginTop: "20px", textAlign: "left", maxWidth: "500px", margin: "auto" }}>
                {songs.length > 0 ? (
                    <ul style={{ listStyleType: "none", padding: 0 }}>
                        {songs.map((song) => (
                            <li key={song.result.id} style={{ marginBottom: "10px" }}>
                                <a
                                    href={song.result.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ textDecoration: "none", color: "blue" }}
                                >
                                    🎵 {song.result.full_title}
                                </a>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p style={{ fontStyle: "italic", color: "gray" }}>No songs found.</p>
                )}
            </div>
        </div>
    );
};

export default Dashboard;