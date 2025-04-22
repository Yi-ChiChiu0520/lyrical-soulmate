import React, { useEffect, useState } from "react";
import axios from "axios";

const stopWords = new Set([
    "the", "and", "a", "to", "of", "in", "is", "it", "you", "that", "on", "for", "with",
    "as", "was", "are", "but", "be", "at", "by", "this", "have", "or", "an", "not", "we"
]);

const WordCloudPanel = ({ user, wordCloudSongs: incomingSongs, loading: loadingProp, started, setStarted }) => {
    const [startError, setStartError] = useState("");
    const [wordCloudSongs, setWordCloudSongs] = useState([]);
    const [wordMap, setWordMap] = useState([]);
    const [viewMode, setViewMode] = useState("cloud");
    const [selectedWord, setSelectedWord] = useState(null);
    const [relatedSongs, setRelatedSongs] = useState([]);
    const [hoveredSongId, setHoveredSongId] = useState(null);
    const [statusMessage, setStatusMessage] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (typeof loadingProp === "boolean") {
            setLoading(loadingProp);
        }
    }, [loadingProp]);

    useEffect(() => {
        if (Array.isArray(incomingSongs) && incomingSongs.length > 0) {
            if (started) {
                generateWordCloud(incomingSongs);
            } else {
                setStartError("❌ Please start the word cloud first.");
            }
        } else {
            setWordMap([]);
            setWordCloudSongs([]);
        }
    }, [incomingSongs, started]);

    const generateWordCloud = async (songs) => {
        setLoading(true);
        const wordFreq = {};
        const updatedSongs = [];

        for (const song of songs) {
            try {
                const res = await axios.get("http://localhost:8080/api/genius/lyrics", {
                    params: { songId: song.songId }
                });
                const lyrics = (res.data.lyrics)
                    .toLowerCase()
                    .replace(/[^a-zA-Z\s]/g, "");
                const words = lyrics.split(/\s+/).filter(word => word && !stopWords.has(word));
                words.forEach(word => {
                    wordFreq[word] = (wordFreq[word] || 0) + 1;
                });
                updatedSongs.push({ ...song, lyrics });
            } catch (err) {
                console.error("Failed to fetch lyrics:", err);
                updatedSongs.push({ ...song, lyrics: "" });
            }
        }

        const entries = Object.entries(wordFreq).slice(0, 100);
        const counts = entries.map(([_, count]) => count);
        const max = Math.max(...counts);
        const min = Math.min(...counts);
        const range = max - min || 1;

        const minFontSize = 12;
        const maxFontSize = 48;

        const scaled = entries.map(([word, count]) => {
            const norm = (count - min) / range;
            const smooth = 1 / (1 + Math.exp(-5 * (norm - 0.5)));
            const size = minFontSize + smooth * (maxFontSize - minFontSize);
            return { word, count, size };
        });

        const shuffled = scaled.sort(() => 0.5 - Math.random());

        setWordMap(shuffled);
        setWordCloudSongs(updatedSongs);
        setSelectedWord(null);
        setRelatedSongs([]);
        setLoading(false);
    };

    const handleWordClick = (word) => {
        setSelectedWord(word);
        const matches = wordCloudSongs.filter(song =>
            song.lyrics?.toLowerCase().includes(word.toLowerCase())
        );
        setRelatedSongs(matches);
    };

    const addToFavorites = async (song) => {
        try {
            await axios.post("http://localhost:8080/api/favorites/add", {
                username: user,
                songId: song.songId,
                title: song.title,
                url: song.url,
                imageUrl: song.imageUrl,
                releaseDate: song.releaseDate,
                artistName: song.artistName,
                lyrics: song.lyrics
            });
            setStatusMessage(`✅ Added ${song.title} to favorites.`);
        } catch (err) {
            setStatusMessage(`❌ Could not add ${song.title} (maybe already in favorites)`);
        }
    };

    const handleRemoveFromWordCloud = (songId) => {
        const updated = wordCloudSongs.filter(song => song.songId !== songId);
        setWordCloudSongs(updated);

        if (!started) {
            setStartError("❌ Please start the word cloud first.");
            return;
        }
        setStartError("");
        generateWordCloud(updated);
    };


    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    <h2 className="text-xl font-semibold mr-4">Word Cloud</h2>
                    <button
                        id="start-wordcloud"
                        onClick={() => {
                            const newState = !started;
                            setStarted(newState);
                            setStartError("");
                            if (newState) {
                                window.dispatchEvent(new CustomEvent("cloud-started", { detail: "✅ Word Cloud started!" }));
                            } else {
                                window.dispatchEvent(new CustomEvent("cloud-started", { detail: "" }));
                            }
                        }}
                        className={`text-sm px-3 py-1 rounded-md font-medium transition-colors duration-200 ${
                            started
                                ? "bg-gray-300 text-gray-700"
                                : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                    >
                        {started ? "Stop Word Cloud" : "Start Word Cloud"}
                    </button>
                    {startError && (
                        <span className="ml-4 text-red-600 text-sm font-medium">{startError}</span>
                    )}
                    <span className="ml-2 bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded">
            {wordCloudSongs.length} songs
          </span>
                </div>

                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">View:</span>
                    <div className="flex border border-gray-300 rounded-md overflow-hidden">
                        <button
                            id="view-cloud"
                            onClick={() => setViewMode("cloud")}
                            className={`px-3 py-1 text-sm ${
                                viewMode === "cloud"
                                    ? "bg-purple-50 text-purple-600 font-medium"
                                    : "bg-white text-gray-500 hover:bg-gray-50"
                            }`}
                        >
                            Word Cloud
                        </button>
                        <button
                            id="view-table"
                            onClick={() => setViewMode("table")}
                            className={`px-3 py-1 text-sm ${
                                viewMode === "table"
                                    ? "bg-purple-50 text-purple-600 font-medium"
                                    : "bg-white text-gray-500 hover:bg-gray-50"
                            }`}
                        >
                            Table
                        </button>
                    </div>
                </div>
            </div>

            {started && Array.isArray(wordCloudSongs) && (
                <div className="divide-y divide-gray-200">
                    {wordCloudSongs.map((song) => (
                        <div key={song.songId} className="py-2 flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium text-gray-900 truncate">🎵 {song.title}</h3>
                            </div>
                            <div className="ml-4 flex-shrink-0">
                                <button
                                    onClick={() => handleRemoveFromWordCloud(song.songId)}
                                    className="text-red-600 hover:text-red-900 text-sm font-medium bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors duration-200"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {loading ? (
                <p style={{ fontStyle: "italic", color: "gray", marginTop: "30px" }}>
                    ⏳ Generating word cloud...
                </p>
            ) : (
                started &&
                (viewMode === "cloud" ? (
                    <div
                        style={{
                            marginTop: "20px",
                            display: "flex",
                            flexWrap: "wrap",
                            justifyContent: "center"
                        }}
                    >
                        {wordMap.map(({ word, size }) => (
                            <span
                                key={word}
                                onClick={() => handleWordClick(word)}
                                style={{
                                    fontSize: `${size}px`,
                                    margin: "8px",
                                    cursor: "pointer"
                                }}
                            >
                {word}
              </span>
                        ))}
                    </div>
                ) : (
                    <table
                        style={{
                            margin: "auto",
                            marginTop: "20px",
                            borderCollapse: "collapse"
                        }}
                    >
                        <thead>
                        <tr>
                            <th>Word</th>
                            <th>Count</th>
                        </tr>
                        </thead>
                        <tbody>
                        {wordMap
                            .sort((a, b) => b.count - a.count)
                            .map(({ word, count }) => (
                                <tr
                                    key={word}
                                    onClick={() => handleWordClick(word)}
                                    style={{ cursor: "pointer" }}
                                >
                                    <td>{word}</td>
                                    <td>{count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ))
            )}

            {selectedWord && started && (
                <div>
                    <h2 className="text-xl font-semibold mb-4">
                        🎧 Songs containing "{selectedWord}"
                    </h2>
                    <div className="divide-y divide-gray-200">
                        {relatedSongs.map((song) => (
                            <div
                                key={song.songId}
                                className="py-3 px-2 flex items-center justify-between group hover:bg-gray-50 rounded-md transition-colors duration-200"
                                onMouseEnter={() => setHoveredSongId(song.songId)}
                                onMouseLeave={() => setHoveredSongId(null)}
                            >
                                <span className="text-gray-900 font-medium">{song.title}</span>
                                <div className="ml-4">
                                    {hoveredSongId === song.songId && (
                                        <button
                                            onClick={() => addToFavorites(song)}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium bg-blue-50 hover:bg-blue-100 px-3 py-0 rounded-md transition-all duration-200"
                                        >
                                            Add to Favorites
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {statusMessage && (
                            <p
                                style={{
                                    color: statusMessage.startsWith("✅") ? "green" : "red"
                                }}
                            >
                                {statusMessage}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WordCloudPanel;
