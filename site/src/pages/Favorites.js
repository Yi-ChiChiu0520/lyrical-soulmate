import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import axios from "axios";

const Favorites = ({ user }) => {
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState([]);
    const [expandedSong, setExpandedSong] = useState(null);
    const [hoveredSongId, setHoveredSongId] = useState(null);
    const [songToRemove, setSongToRemove] = useState(null);
    const [lastActivity, setLastActivity] = useState(Date.now());
    const [isPrivate, setIsPrivate] = useState(false);
    const [message, setMessage] = useState("");

    const resetInactivityTimer = () => setLastActivity(Date.now());

    useEffect(() => {
        const fetchPrivacyStatus = async () => {
            try {
                const res = await axios.get(`http://localhost:8080/api/favorites/privacy/${user}?requester=${user}`);
                setIsPrivate(res.data);
            } catch (err) {
                console.error("Failed to fetch privacy setting", err);
                setMessage("⚠️ Could not load privacy settings.");
            }
        };
        fetchPrivacyStatus();
    }, [user]);

    const handleTogglePrivacy = async () => {
        try {
            await axios.post(`http://localhost:8080/api/favorites/privacy/${user}?isPrivate=${!isPrivate}`);
            const res = await axios.get(`http://localhost:8080/api/favorites/privacy/${user}?requester=${user}`);
            setIsPrivate(res.data);
            setMessage(`Favorites are now ${res.data ? "Private 🔒" : "Public 🌐"}`);
        } catch (err) {
            console.error("Failed to update privacy", err);
            setMessage("⚠️ Failed to update privacy.");
        }
    };

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
            const response = await axios.get(`http://localhost:8080/api/favorites/${user}?requester=${user}`);
            const filtered = (response.data).filter(song => song && song.songId);
            setFavorites(filtered);
        } catch (error) {
            console.error("Error fetching favorites:", error);
            setFavorites([]);
            setMessage("⚠️ Could not fetch favorite songs.");
        }
    };

    const removeFromFavorites = async (songId) => {
        try {
            await axios.delete(`http://localhost:8080/api/favorites/remove/${user}/${songId}`);
            setFavorites([]);
            await fetchFavorites();
            resetInactivityTimer();
            setMessage("❌ Song removed from favorites.");
        } catch (error) {
            console.error("Error removing from favorites:", error);
            setMessage("⚠️ Failed to remove song.");
        }
    };

    const clearAllFavorites = async () => {
        try {
            const requests = favorites.map(song =>
                axios.delete(`http://localhost:8080/api/favorites/remove/${user}/${song.songId}`)
            );
            await Promise.all(requests);
            setFavorites([]);
            setMessage("🧹 All songs cleared from favorites.");
        } catch (error) {
            console.error("Error clearing all favorites:", error);
            setMessage("⚠️ Failed to clear favorites.");
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
            setMessage("⚠️ Failed to reorder favorites.");
        }
    };

    if (!user) return <Navigate to="/" replace />;

    return (
        <div className="@container flex-1 bg-[#d0c2dc] py-8 px-4 sm:px-6 lg:px-8" onClick={resetInactivityTimer}>
            <div className="max-w-3xl mx-auto">
                <h1 id="favorites-header" className="text-3xl font-bold text-[#3d3547] mb-6" aria-label={`${user}'s Favorite Songs Header`}>
                    💖 {user}&apos;s Favorite Songs
                </h1>

                {message && (
                    <div aria-label="Notification Message" className="mb-4 px-4 py-2 rounded bg-yellow-100 text-yellow-800 border border-yellow-300 shadow-sm">
                        {message}
                    </div>
                )}

                <div className="mb-4 flex items-center space-x-4">
                    <span aria-label="Favorites Privacy Label" className="text-gray-800 font-medium">🔒 Favorites Privacy:</span>
                    <div
                        role="switch"
                        aria-label="Toggle Privacy"
                        aria-checked={isPrivate}
                        tabIndex={0}
                        className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition duration-300 ${isPrivate ? "bg-purple-600" : "bg-gray-400"}`}
                        onClick={handleTogglePrivacy}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault(); // prevent scrolling on spacebar
                                handleTogglePrivacy();
                            }
                        }}
                    >
                        <div
                            className={`bg-white w-6 h-6 rounded-full shadow-md transform duration-300 ease-in-out ${isPrivate ? "translate-x-6" : "translate-x-0"}`}
                        ></div>
                    </div>
                    <span aria-label={`Favorites are currently ${isPrivate ? "Private" : "Public"}`} className="text-sm text-gray-700">{isPrivate ? "Private" : "Public"}</span>
                </div>

                {favorites.length > 0 && (
                    <div className="mb-4">
                        <button
                            onClick={clearAllFavorites}
                            aria-label="Clear All Favorites"
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            🧹 Clear All Favorites
                        </button>
                    </div>
                )}

                {favorites.length > 0 ? (
                    <ul id="favorites-list" className="bg-white rounded-lg shadow overflow-hidden">
                        {favorites.map((song, index) => (
                            <li key={song.songId}
                                id={song.title.replace(/\s/g, '').replace(/[\s\u00A0]/g, '').replace(/[^a-zA-Z0-9_-]/g, '')}
                                onMouseEnter={() => setHoveredSongId(song.songId)}
                                onMouseLeave={() => setHoveredSongId(null)}
                                tabIndex={0}
                                role="button"
                                aria-expanded={expandedSong === song.songId}
                                onFocus={() => setHoveredSongId(song.songId)}
                                onBlur={(e) => {
                                    const currentTarget = e.currentTarget;
                                    setTimeout(() => {
                                        if (document.activeElement && !currentTarget.contains(document.activeElement)) {
                                            setHoveredSongId(null);
                                        }
                                    }, 10);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        setExpandedSong(expandedSong === song.songId ? null : song.songId);

                                    }
                                }}
                                className="border-b last:border-b-0 border-gray-200 group relative"
                                aria-label={`Favorite Song: ${song.title}`}>

                                <div className="p-4 flex items-center cursor-pointer hover:bg-gray-50 transition-colors">
                                    <div className="flex-shrink-0 mr-4">
                                        <img
                                            src={song.imageUrl}
                                            alt={`Cover image for ${song.title}`}
                                            width={50}
                                            height={50}
                                            className="rounded-md shadow-sm"
                                        />
                                    </div>
                                    <div className="flex-grow">
                                        <span
                                            id="song-title"
                                            onClick={() => setExpandedSong(expandedSong === song.songId ? null : song.songId)}
                                            className="text-lg font-medium text-gray-900"
                                            aria-label={`Song Title: ${song.title}`}
                                        >
                                            {song.title}
                                        </span>

                                        {expandedSong === song.songId && (
                                            <div className="mt-2 text-gray-600 animate-fadeIn">
                                                <p id="artist-name" className="font-medium" aria-label={`Artist Name: ${song.artistName}`}>
                                                    🎤 Artist: <strong>{song.artistName}</strong>
                                                </p>
                                                <p id="release-date" aria-label={`Release Date: ${song.releaseDate}`}>
                                                    📅 Release Date: <strong>{song.releaseDate}</strong>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div
                                       className={`absolute right-4 top-1/2 -translate-y-1/2 flex space-x-2 transition-opacity duration-300 ${
                                           hoveredSongId === song.songId ? "opacity-100" : "opacity-0 pointer-events-none"
                                       }`}
                                    >
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
                                            onClick={() => setSongToRemove(song)}
                                            id="remove-favorite"
                                            className="px-2 py-1 rounded-md hover:bg-red-100 transition-colors"
                                            aria-label="Remove"
                                        >
                                            ❌
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="italic text-gray-700" aria-label="No favorite songs yet message">No favorite songs yet.</p>
                )}

                {songToRemove && (
                    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-md shadow-lg text-center" id="confirm-remove-modal">
                            <h3 aria-label="Confirm Removal Header" className="text-lg font-semibold mb-2">Confirm Removal</h3>
                            <p aria-label={`Confirm removal of ${songToRemove.title}`}>Are you sure you want to remove {songToRemove.title} from your favorites?</p>
                            <div className="mt-4">
                                <button
                                    id="accept-remove"
                                    onClick={() => {
                                        removeFromFavorites(songToRemove.songId);
                                        setSongToRemove(null);
                                    }}
                                    className="mr-3 px-4 py-2 bg-green-500 text-white rounded"
                                    aria-label="Yes, remove song from favorites"
                                >
                                    Yes, remove song
                                </button>
                                <button
                                    id="decline-remove"
                                    onClick={() => setSongToRemove(null)}
                                    className="px-4 py-2 bg-red-500 text-white rounded"
                                    aria-label="No, do not remove song"
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
