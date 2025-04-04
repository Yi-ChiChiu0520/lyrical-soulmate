    import React, { useEffect, useState } from "react";
    import axios from "axios";

    const stopWords = new Set([
        "the", "and", "a", "to", "of", "in", "is", "it", "you", "that", "on", "for", "with",
        "as", "was", "are", "but", "be", "at", "by", "this", "have", "or", "an", "not", "we"
    ]);

    const WordCloudPanel = ({ user, wordCloudSongs: incomingSongs = [], loading: loadingProp }) => {
        const [wordCloudSongs, setWordCloudSongs] = useState([]);
        const [wordMap, setWordMap] = useState([]);
        const [viewMode, setViewMode] = useState("cloud");
        const [selectedWord, setSelectedWord] = useState(null);
        const [relatedSongs, setRelatedSongs] = useState([]);
        const [hoveredSongId, setHoveredSongId] = useState(null);
        const [statusMessage, setStatusMessage] = useState("");
        const [loading, setLoading] = useState(false);

        // Update loading state if a loadingProp is provided.
        useEffect(() => {
            if (typeof loadingProp === "boolean") {
                setLoading(loadingProp);
            }
        }, [loadingProp]);

        // When the incoming songs prop changes, either generate the word cloud or fetch songs.
        useEffect(() => {
            if (Array.isArray(incomingSongs) && incomingSongs.length > 0) {
                generateWordCloud(incomingSongs);
            } else {
                fetchWordCloudSongs();
            }
        }, [incomingSongs]);

        const fetchWordCloudSongs = async () => {
            try {
                const res = await axios.get(`http://localhost:8080/api/wordcloud/${user}`);
                // Ensure we treat res.data as an array.
                const songs = Array.isArray(res.data) ? res.data : [];
                setWordCloudSongs(songs);
                generateWordCloud(songs);
            } catch (err) {
                console.error("Failed to fetch word cloud songs:", err);
            }
        };

        const generateWordCloud = async (songs) => {
            setLoading(true);
            const wordFreq = {};
            const updatedSongs = [];

            for (const song of songs) {
                try {
                    const res = await axios.get("http://localhost:8080/api/genius/lyrics", {
                        params: { songId: song.songId }
                    });
                    const lyrics = (res.data.lyrics || "")
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

            const sortedEntries = Object.entries(wordFreq)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 100);

            // Shuffle for a scattered appearance.
            const shuffled = sortedEntries.sort(() => 0.5 - Math.random());

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

        const handleRemoveFromWordCloud = async (songId) => {
            try {
                await axios.delete(`http://localhost:8080/api/wordcloud/remove/${user}/${songId}`);
                const updated = wordCloudSongs.filter(song => song.songId !== songId);
                setWordCloudSongs(updated);
                generateWordCloud(updated);
            } catch (err) {
                console.error("Failed to remove song from word cloud:", err);
            }
        };

        return (
            <div style={{ padding: "20px", textAlign: "center" }}>
                <button onClick={() => setViewMode(viewMode === "cloud" ? "table" : "cloud")}>
                    Switch to {viewMode === "cloud" ? "Tabular" : "Word Cloud"} View
                </button>

                <div style={{ marginTop: "30px", textAlign: "left", maxWidth: "600px", marginInline: "auto" }}>
                    <h3>📀 Songs in Word Cloud</h3>
                    <ul style={{ paddingLeft: "20px" }}>
                        {Array.isArray(wordCloudSongs) &&
                            wordCloudSongs.map(song => (
                                <li
                                    key={song.songId}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center"
                                    }}
                                >
                                    <span>🎵 {song.title}</span>
                                    <button
                                        onClick={() => handleRemoveFromWordCloud(song.songId)}
                                        style={{
                                            marginLeft: "10px",
                                            background: "red",
                                            color: "white",
                                            border: "none",
                                            padding: "4px 8px",
                                            cursor: "pointer"
                                        }}
                                    >
                                        ❌ Remove
                                    </button>
                                </li>
                            ))}
                    </ul>
                </div>

                {loading ? (
                    <p style={{ fontStyle: "italic", color: "gray", marginTop: "30px" }}>
                        ⏳ Generating word cloud...
                    </p>
                ) : viewMode === "cloud" ? (
                    <div style={{ marginTop: "20px", display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
                        {wordMap.map(([word, count]) => (
                            <span
                                key={word}
                                onClick={() => handleWordClick(word)}
                                style={{
                                    fontSize: `${Math.min(12 + count * 2, 48)}px`,
                                    margin: "8px",
                                    cursor: "pointer"
                                }}
                            >
                  {word}
                </span>
                        ))}
                    </div>
                ) : (
                    <table style={{ margin: "auto", marginTop: "20px", borderCollapse: "collapse" }}>
                        <thead>
                        <tr>
                            <th>Word</th>
                            <th>Count</th>
                        </tr>
                        </thead>
                        <tbody>
                        {wordMap
                            .sort((a, b) => b[1] - a[1])
                            .map(([word, count]) => (
                                <tr key={word} onClick={() => handleWordClick(word)} style={{ cursor: "pointer" }}>
                                    <td>{word}</td>
                                    <td>{count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {selectedWord && (
                    <div style={{ marginTop: "30px" }}>
                        <h3>🎧 Songs containing "{selectedWord}"</h3>
                        {
                            relatedSongs.map(song => (
                                <div
                                    key={song.songId}
                                    style={{
                                        marginBottom: "10px",
                                        padding: "10px",
                                        border: "1px solid #ccc",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center"
                                    }}
                                    onMouseEnter={() => setHoveredSongId(song.songId)}
                                    onMouseLeave={() => setHoveredSongId(null)}
                                >
                                    <span>{song.title}</span>
                                    {hoveredSongId === song.songId && (
                                        <button onClick={() => addToFavorites(song)}>Add to Favorites</button>
                                    )}
                                </div>
                            )
                        )}
                        {statusMessage && (
                            <p style={{ color: statusMessage.startsWith("✅") ? "green" : "red" }}>
                                {statusMessage}
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    };

    export default WordCloudPanel;
