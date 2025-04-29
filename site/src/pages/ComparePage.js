import React, { useState, useEffect } from "react";
import axios from "axios";

const ComparePage = ({ user }) => {
    const [searchInput, setSearchInput] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [selectedSuggestions, setSelectedSuggestions] = useState([]);
    const [addedFriends, setAddedFriends] = useState([]);
    const [songMap, setSongMap] = useState({});
    const [expandedSongs, setExpandedSongs] = useState({});
    const [lastActivity, setLastActivity] = useState(Date.now());
    const [privateUserErrors, setPrivateUserErrors] = useState([]);

    const resetInactivityTimer = () => setLastActivity(Date.now());

    useEffect(() => {
        if (!user) return;

        const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
        events.forEach(event => window.addEventListener(event, resetInactivityTimer));

        const timeoutCheck = setInterval(() => {
            if (Date.now() - lastActivity > 60000) {
                handleLogout();
                clearInterval(timeoutCheck);
            }
        }, 1000);

        return () => {
            events.forEach(event => window.removeEventListener(event, resetInactivityTimer));
            clearInterval(timeoutCheck);
        };
    }, [user, lastActivity]);

    const handleLogout = () => {
        localStorage.removeItem("user");
        window.location.reload();
    };

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (searchInput.trim() === "") {
                setSuggestions([]);
                return;
            }

            try {
                const res = await axios.get(`http://localhost:8080/users/search?prefix=${searchInput}`);
                setSuggestions(res.data);
            } catch (err) {
                setSuggestions([]);
            }
        };

        fetchSuggestions();
    }, [searchInput]);

    useEffect(() => {
        if (!user) return;

        const loadOwnFavorites = async () => {
            try {
                const res = await axios.get(`http://localhost:8080/api/favorites/${user}?requester=${user}`);
                const updated = mergeSongs(user, res.data, {});
                setSongMap(updated);
                setAddedFriends([user]);
            } catch (err) {
                console.error("Failed to load your own favorites");
            }
        };

        loadOwnFavorites();
    }, [user]);

    const handleSelectSuggestion = (name) => {
        setSearchInput(name);
    };

    const handleBulkAdd = async () => {
        const usernamesToAdd = selectedSuggestions.filter(name => !addedFriends.includes(name));
        let updatedMap = { ...songMap };
        let errorList = [];

        for (const username of usernamesToAdd) {
            try {
                const privacyRes = await axios.get(`http://localhost:8080/api/favorites/privacy/${username}?requester=${user}`);
                const isPrivate = privacyRes.data;

                if (isPrivate) {
                    errorList.push(`${username}'s favorites are private.`);
                    continue;
                }

                const favoritesRes = await axios.get(`http://localhost:8080/api/favorites/${username}?requester=${user}`);
                const favorites = favoritesRes.data;

                updatedMap = mergeSongs(username, favorites, updatedMap);
                setAddedFriends(prev => [...prev, username]);
            } catch (err) {
                if (err.response?.status === 403) {
                    errorList.push(`${username}'s favorites are private.`);
                } else {
                    console.error(`Error loading favorites for ${username}`, err);
                    errorList.push(`Could not load favorites for ${username}.`);
                }
            }
        }

        setPrivateUserErrors(errorList);
        setSongMap(updatedMap);
        setSearchInput("");
        setSuggestions([]);
        setSelectedSuggestions([]);
    };

    const toggleSongDetails = (songId) => {
        setExpandedSongs(prev => ({
            ...prev,
            [songId]: !prev[songId]
        }));
    };

    // Ranking logic
    const rankedSongs = Object.entries(songMap)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.users.length - a.users.length);

    let currentRank = 1;
    let lastCount = null;
    const rankedWithPosition = rankedSongs.map((song, index) => {
        if (song.users.length !== lastCount) {
            currentRank = index + 1;
            lastCount = song.users.length;
        }
        return { ...song, rank: currentRank };
    });

    if (!user) return null;

    return (
        <div onClick={resetInactivityTimer} className="p-6 text-white bg-[#2d203f] min-h-screen">
            <h1 className="text-2xl font-bold mb-4" aria-label="Find Friends page heading">Find Friends</h1>

            <div className="mb-6 relative">
                <input
                    type="text"
                    placeholder="Search by username"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="p-2 text-black rounded-md w-64"
                    id="compare-search-input"
                    aria-label="Search by username"
                />

                {suggestions.length > 0 && (
                    <ul className="absolute z-10 bg-white text-black mt-1 rounded shadow w-64 max-h-60 overflow-y-auto" id="compare-suggestions-list" aria-label="Suggestions list">
                        {suggestions.map((suggestion) => (
                            <li key={suggestion} className="px-4 py-2 hover:bg-purple-100 flex items-center">
                                <input
                                    type="checkbox"
                                    className="mr-2"
                                    value={suggestion}
                                    checked={selectedSuggestions.includes(suggestion)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedSuggestions(prev => [...prev, suggestion]);
                                        } else {
                                            setSelectedSuggestions(prev => prev.filter(name => name !== suggestion));
                                        }
                                    }}
                                    aria-label={`Select ${suggestion}`}
                                />
                                <span aria-label={`Select suggestion ${suggestion}`} onClick={() => handleSelectSuggestion(suggestion)} className="cursor-pointer">{suggestion}</span>
                            </li>
                        ))}
                    </ul>
                )}

                <button
                    id="compare-add-button"
                    onClick={handleBulkAdd}
                    disabled={selectedSuggestions.length === 0}
                    className={`ml-4 px-4 py-2 mt-2 rounded ${selectedSuggestions.length > 0 ? "bg-purple-500 hover:bg-purple-600" : "bg-gray-500 cursor-not-allowed"}`}
                    aria-label="Compare selected friends"
                >
                    Compare Selected
                </button>
            </div>

            {privateUserErrors.length > 0 && (
                <div className="mb-6 text-red-400 bg-red-900 bg-opacity-20 p-4 rounded" aria-label="Private user error messages">
                    {privateUserErrors.map((msg, idx) => (
                        <div aria-label={`Warning msg: ${msg}`} key={idx}>⚠️ {msg}</div>
                    ))}
                </div>
            )}

            <h2 className="text-xl font-bold mt-10 mb-4" aria-label="Favorite Songs section">Favorite Songs by You and Friends</h2>
            <ul className="space-y-4" aria-label="Favorite songs list">
                {rankedWithPosition.map((data) => (
                    <li key={data.id} className="bg-[#3d2f5d] p-4 rounded hover:bg-[#4c3b6d]">
                        <div className="flex justify-between items-center">
                            <div onClick={() => toggleSongDetails(data.id)} className="cursor-pointer text-lg font-semibold flex flex-col">
                                <span>{data.title}</span>
                                <UserHover usernames={data.users}>
                                    <span className="text-xs text-gray-300">{data.users.length} favorited</span>
                                </UserHover>
                            </div>
                            <RankHover rank={data.rank} usernames={data.users} onClick={() => toggleSongDetails(data.id)} />
                        </div>
                        {expandedSongs[data.id] && (
                            <div className="mt-2 text-sm text-gray-300">
                                <p>Artist: {data.artistName}</p>
                                <p>Release Date: {data.releaseDate}</p>
                                <div className="mt-2">
                                    <p>Favorited by ({data.users.length} friends):</p>
                                    <ul className="list-disc list-inside">
                                        {data.users.map((username) => (
                                            <li key={username}>{username}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};

// Shows #rank badge with hover user list
export const RankHover = ({ rank, usernames, onClick }) => {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            className="relative text-sm font-bold bg-purple-600 px-2 py-1 rounded text-white cursor-pointer"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={onClick}
            onFocus={() => setHovered(true)}
            onBlur={() => setHovered(false)}
            tabIndex={0}
            aria-label={`Song rank ${rank}`}
        >
            #{rank}
            {hovered && (
                <div className="absolute right-0 mt-1 bg-gray-800 text-white text-xs p-2 rounded shadow z-10 whitespace-nowrap">
                    <div aria-label={"Users who like this song"} className="font-semibold mb-1">Users:</div>
                    {usernames.map((name) => (
                        <div aria-label={`User ${name} has rank ${rank}`} key={name}>{name}</div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Shows favorited count with hover user list
export const UserHover = ({ usernames, children }) => {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={() => setHovered(false)}
            tabIndex={0}
            aria-label={`Song rank ${rank}`}
        >
            {children}
            {hovered && (
                <div className="absolute left-0 mt-1 bg-gray-800 text-white text-xs p-2 rounded shadow z-10 whitespace-nowrap">
                    <div className="font-semibold mb-1">Users:</div>
                    {usernames.map((name) => (
                        <div key={name}>{name}</div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const mergeSongs = (user, songs, existingSongMap) => {
    const updatedMap = { ...existingSongMap };

    songs.forEach(song => {
        const songKey = song.songId || song.id;

        if (!updatedMap[songKey]) {
            updatedMap[songKey] = {
                songId: songKey,
                title: song.title,
                artistName: song.artistName || "Unknown",
                releaseDate: song.releaseDate,
                users: [],
            };
        }

        if (!updatedMap[songKey].users.includes(user)) {
            updatedMap[songKey].users.push(user);
        }
    });

    return updatedMap;
};

export default ComparePage;
