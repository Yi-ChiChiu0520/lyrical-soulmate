import React, { useState, useEffect } from "react";
import axios from "axios";

const FriendsPage = ({ user }) => {
    const [searchInput, setSearchInput] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [selectedSuggestions, setSelectedSuggestions] = useState([]);
    const [addedFriends, setAddedFriends] = useState([]);
    const [songMap, setSongMap] = useState({}); // songId -> { song, users: [] }
    const [expandedSongs, setExpandedSongs] = useState({});

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

    const handleSelectSuggestion = (name) => {
        setSearchInput(name);
    };

    const handleBulkAdd = async () => {
        const usernamesToAdd = selectedSuggestions.filter(name => !addedFriends.includes(name));
        let updatedMap = { ...songMap };

        for (const username of usernamesToAdd) {
            try {
                const res = await axios.get(`http://localhost:8080/api/favorites/${username}`);
                const favorites = res.data;

                updatedMap = mergeSongs(username, favorites, updatedMap);
                setAddedFriends(prev => [...prev, username]);
            } catch (err) {
                console.error(`Error loading favorites for ${username}`);
            }
        }

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

    return (
        <div className="p-6 text-white bg-[#2d203f] min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Find Friends</h1>

            <div className="mb-6 relative">
                <input
                    type="text"
                    placeholder="Search by username"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="p-2 text-black rounded-md w-64"
                />

                {suggestions.length > 0 && (
                    <ul className="absolute z-10 bg-white text-black mt-1 rounded shadow w-64 max-h-60 overflow-y-auto">
                        {suggestions.map((suggestion) => (
                            <li key={suggestion} className="px-4 py-2 hover:bg-purple-100 flex items-center">
                                <input
                                    type="checkbox"
                                    className="mr-2"
                                    checked={selectedSuggestions.includes(suggestion)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedSuggestions(prev => [...prev, suggestion]);
                                        } else {
                                            setSelectedSuggestions(prev =>
                                                prev.filter(name => name !== suggestion)
                                            );
                                        }
                                    }}
                                />
                                <span onClick={() => handleSelectSuggestion(suggestion)}>{suggestion}</span>
                            </li>
                        ))}
                    </ul>
                )}

                <button
                    onClick={handleBulkAdd}
                    disabled={selectedSuggestions.length === 0}
                    className={`ml-4 px-4 py-2 mt-2 rounded ${
                        selectedSuggestions.length > 0
                            ? "bg-purple-500 hover:bg-purple-600"
                            : "bg-gray-500 cursor-not-allowed"
                    }`}
                >
                    Add Selected
                </button>
            </div>

            <h2 className="text-xl font-bold mt-10 mb-4">Favorite Songs by Everyone</h2>
            <ul className="space-y-4">
                {Object.entries(songMap).map(([songId, data]) => (
                    <li key={songId} className="bg-[#3d2f5d] p-4 rounded hover:bg-[#4c3b6d]">
                        <div onClick={() => toggleSongDetails(songId)} className="cursor-pointer text-lg font-semibold">
                            {data.title}
                        </div>
                        {expandedSongs[songId] && (
                            <div className="mt-2 text-sm text-gray-300">
                                <p>Artist: {data.artistName}</p>
                                <p>Release Date: {data.releaseDate}</p>
                            </div>
                        )}
                        <FriendHover usernames={data.users} />
                    </li>
                ))}
            </ul>
        </div>
    );
};

// 🧠 Hoverable friend count display
const FriendHover = ({ usernames }) => {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="relative mt-2 text-sm"
        >
            <span>{usernames.length} friend(s) have this song</span>
            {hovered && (
                <div className="absolute left-0 mt-1 bg-gray-800 text-white text-xs p-2 rounded shadow">
                    {usernames.map(name => (
                        <div key={name}>{name}</div>
                    ))}
                </div>
            )}
        </div>
    );
};

// 🔁 Helper: merge songs from multiple users into one map
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


export default FriendsPage;
