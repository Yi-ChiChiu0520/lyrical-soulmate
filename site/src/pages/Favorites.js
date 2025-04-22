// Favorites.js
import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import axios from "axios";

const Favorites = ({ user }) => {
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState([]);
    const [expandedSong, setExpandedSong] = useState(null);
    const [hoveredSongId, setHoveredSongId] = useState(null);
    const [songToRemove, setSongToRemove] = useState(null); // is passed a song
    const [lastActivity, setLastActivity] = useState(Date.now());

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
        window.location.reload();
        navigate("/");
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

    if (!user) return <Navigate to="/" replace />;

    return (
        <div className="@container flex-1 bg-[#d0c2dc] py-8 px-4 sm:px-6 lg:px-8" onClick={resetInactivityTimer}>
            <div className="max-w-3xl mx-auto">
                <h1 id="favorites-header" className="text-3xl font-bold text-[#3d3547] mb-6">💖 {user}&apos;s Favorite Songs</h1>

                {favorites.length > 0 ? (
                <ul id="favorites-list" className="bg-white rounded-lg shadow overflow-hidden">
                    {favorites.map((song, index) => (
                        <li key={song.songId}
                            id={song.title.replace(/\s/g, '').replace(/[\s\u00A0]/g, '').replace(/[^a-zA-Z0-9_-]/g, '')} // unique ID created by the song name by removing all spaces/illegal characters
                            onMouseEnter={() => setHoveredSongId(song.songId)}
                            onMouseLeave={() => setHoveredSongId(null)}
                            className="border-b last:border-b-0 border-gray-200 group relative">
                            <div
                                className="p-4 flex items-center cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex-shrink-0 mr-4">
                                    <img
                                        src={song.imageUrl}
                                        alt="cover"
                                        width={50}
                                        height={50}
                                        className="rounded-md shadow-sm"
                                    />
                                </div>
                                <div className="flex-grow">
                                    <span id="song-title"
                                          onClick={() => setExpandedSong(expandedSong === song.songId ? null : song.songId)}
                                          className="text-lg font-medium text-gray-900">{song.title}</span>

                                    {/* Expanded content */}
                                    {expandedSong === song.songId && (
                                        <div className="mt-2 text-gray-600 animate-fadeIn">
                                            <p id="artist-name" className="font-medium">🎤 Artist: <strong>{song.artistName}</strong></p>
                                            <p id="release-date">📅 Release Date: <strong>{song.releaseDate}</strong></p>
                                        </div>
                                    )}
                                </div>

                                {hoveredSongId === song.songId && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex space-x-2">
                                        <button
                                            onClick={() => moveFavorite(index, "up")}
                                            id="move-up"
                                            className="px-2 py-1 rounded-md hover:bg-gray-200 transition-colors"
                                            aria-label="Move up"
                                        >
                                            ⬆️
                                        </button>
                                        <button
                                            onClick={() => moveFavorite(index, "down")}
                                            id="move-down"
                                            className="px-2 py-1 rounded-md hover:bg-gray-200 transition-colors"
                                            aria-label="Move down"
                                        >
                                            ⬇️
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSongToRemove(song);
                                            }}
                                            id="remove-favorite"
                                            className="px-2 py-1 rounded-md hover:bg-red-100 transition-colors"
                                            aria-label="Remove"
                                        >
                                            ❌
                                        </button>
                                    </div>)}
                            </div>
                        </li>
                    ))}
                </ul>):(
                    <p className="italic text-gray-700">No favorite songs yet.</p>
                )}
                {songToRemove != null && (
                    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-md shadow-lg text-center" id="confirm-remove-modal">
                            <h3 className="text-lg font-semibold mb-2">Confirm Removal</h3>
                            <p>Are you sure you want to remove {songToRemove.title} from your favorites?</p>
                            <div className="mt-4">
                                <button
                                    id="accept-remove"
                                    onClick={() => { removeFromFavorites(songToRemove.songId); setSongToRemove(null); }} // remove song and close modal
                                    className="mr-3 px-4 py-2 bg-green-500 text-white rounded"
                                >
                                    Yes, remove song
                                </button>
                                <button
                                    id="decline-remove"
                                    onClick={() => setSongToRemove(null)} // close modal
                                    className="px-4 py-2 bg-red-500 text-white rounded"
                                >
                                    No
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Favorites;
