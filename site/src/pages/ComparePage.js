import React, { useState, useEffect } from "react";
import axios from "axios";

const ComparePage = ({ user }) => {
    const [searchInput, setSearchInput] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [addedFriends, setAddedFriends] = useState([]);
    const [compareList, setCompareList] = useState([]);
    const [songMap, setSongMap] = useState({});
    const [expandedSongs, setExpandedSongs] = useState({});
    const [lastActivity, setLastActivity] = useState(Date.now());
    const [privateUserErrors, setPrivateUserErrors] = useState([]);
    const [reverseOrder, setReverseOrder] = useState(false);

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

    useEffect(() => {
        if (user) loadOwnFavorites();
    }, [user]);

    const handleAddToCompareList = () => {
        const username = searchInput.trim();
        if (!username || compareList.includes(username) || username === user) return;
        setCompareList(prev => [...prev, username]);
        setSearchInput("");
        setPrivateUserErrors([]);
    };

    const handleCompare = async () => {
        const allUsers = [user, ...compareList];
        let newSongMap = {};
        let errors = [];

        for (const username of allUsers) {
            try {
                const privacyRes = await axios.get(`http://localhost:8080/api/favorites/privacy/${username}?requester=${user}`);
                const isPrivate = privacyRes.data;

                if (isPrivate) {
                    errors.push(`${username}'s favorite list is private.`);
                    setSongMap({});
                    setCompareList([]);
                    setAddedFriends([]);
                    setPrivateUserErrors(errors);
                    return; // Stop immediately if private
                }

                const favoritesRes = await axios.get(`http://localhost:8080/api/favorites/${username}?requester=${user}`);
                const favorites = favoritesRes.data;
                if (Array.isArray(favorites)) {
                    newSongMap = mergeSongs(username, favorites, newSongMap);
                } else {
                    throw { response: { status: 404 } }; // Simulate not found
                }
            } catch (err) {
                if (username !== user && err.response?.status === 404) {
                    errors.push(`${username} does not exist.`);
                } else if (username !== user && err.response?.status === 403) {
                    errors.push(`${username}'s favorite list is private.`);
                    setSongMap({});
                    setCompareList([]);
                    setAddedFriends([]);
                    setPrivateUserErrors(errors);
                    return; // Stop immediately if private
                } else {
                    console.error(`Unexpected error loading favorites for ${username}:`, err);
                }
            }
        }

        setSongMap(newSongMap);
        setPrivateUserErrors(errors);
    };

    const toggleSongDetails = (songId) => {
        setExpandedSongs(prev => ({ ...prev, [songId]: !prev[songId] }));
    };

    const toggleReverseOrder = () => {
        setReverseOrder(prev => !prev);
    };

    const rankedSongs = Object.entries(songMap)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => reverseOrder ? a.users.length - b.users.length : b.users.length - a.users.length);

    let currentRank = 1;
    let lastCount = null;
    const rankedWithPosition = rankedSongs.map((song, index) => {
        if (song.users.length !== lastCount) {
            currentRank = index + 1;
            lastCount = song.users.length;
        }
        return { ...song, rank: currentRank };
    });

    return (
        <div onClick={resetInactivityTimer} className="p-6 text-white bg-[#2d203f] min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Compare Favorites</h1>

            <div className="mb-6 flex flex-wrap gap-4 items-start relative z-0">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search by username"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="p-2 text-black rounded-md w-64"
                    />
                    {suggestions.length > 0 && (
                        <ul className="absolute z-10 bg-white text-black mt-1 rounded shadow w-full max-h-60 overflow-y-auto">
                            {suggestions.map(s => (
                                <li key={s} className="px-4 py-2 hover:bg-purple-100 cursor-pointer" onClick={() => setSearchInput(s)}>{s}</li>
                            ))}
                        </ul>
                    )}
                </div>

                <button onClick={handleAddToCompareList} className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded">
                    Add to Compare List
                </button>

                <button onClick={handleCompare} className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded">
                    Compare Now
                </button>

                <button onClick={toggleReverseOrder} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded">
                    {reverseOrder ? "Most to Least" : "Least to Most"}
                </button>
            </div>

            {compareList.length > 0 && (
                <div className="mb-4 text-sm text-gray-300">
                    <p className="mb-1">Users queued for comparison:</p>
                    <ul className="list-disc list-inside">
                        {compareList.map(name => <li key={name}>{name}</li>)}
                    </ul>
                </div>
            )}

            {privateUserErrors.length > 0 && (
                <div className="mb-6 text-red-400 bg-red-900 bg-opacity-20 p-4 rounded">
                    {privateUserErrors.map((msg, idx) => (
                        <div key={idx}>⚠️ {msg}</div>
                    ))}
                </div>
            )}

            {rankedWithPosition.length > 0 && (
                <>
                    <h2 className="text-xl font-bold mt-10 mb-4">Favorite Songs by You and Friends</h2>
                    <ul className="space-y-4">
                        {rankedWithPosition.map((data) => (
                            <li key={data.id} className="bg-[#3d2f5d] p-4 rounded hover:bg-[#4c3b6d]">
                                <div className="flex justify-between items-center">
                                    <div
                                        onClick={() => toggleSongDetails(data.id)}
                                        className="cursor-pointer text-lg font-semibold flex flex-col"
                                        tabIndex={0}
                                        role="button"
                                    >
                                        <span>{data.title}</span>
                                        <UserHover usernames={data.users}>
                                            <span className="text-xs text-gray-300">{data.users.length} favorited</span>
                                        </UserHover>
                                    </div>
                                    <RankHover
                                        rank={data.rank}
                                        usernames={data.users}
                                        tabIndex={0}
                                        role="button"
                                        onClick={() => toggleSongDetails(data.id)}
                                    />
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
                </>
            )}
        </div>
    );
};

export const RankHover = ({ rank, usernames, onClick, ...props }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            className="relative text-sm font-bold bg-purple-600 px-2 py-1 rounded text-white cursor-pointer"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={onClick}
            {...props}
        >
            #{rank}
            {hovered && (
                <div className="absolute right-0 mt-1 bg-gray-800 text-white text-xs p-2 rounded shadow z-10 whitespace-nowrap">
                    <div className="font-semibold mb-1">Users:</div>
                    {usernames.map((name) => (
                        <div key={name}>{name}</div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const UserHover = ({ usernames, children }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            tabIndex={0}
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
