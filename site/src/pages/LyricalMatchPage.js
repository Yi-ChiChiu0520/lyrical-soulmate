import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import WordCloudPanel from "./WordCloudPanel";

const stopWords = new Set([
    "the", "and", "a", "to", "of", "in", "is", "it", "you", "that", "on", "for", "with",
    "as", "was", "are", "but", "be", "at", "by", "this", "have", "or", "an", "not", "we"
]);

const LyricalMatchPage = ({ user }) => {
    const [soulmate, setSoulmate] = useState(null);
    const [enemy, setEnemy] = useState(null);
    const [celebration, setCelebration] = useState(false);
    const [sinister, setSinister] = useState(false);
    const [lastActivity, setLastActivity] = useState(Date.now());
    const [showSoulmate, setShowSoulmate] = useState(false);
    const [showEnemy, setShowEnemy] = useState(false);
    const [isMutualSoulmate, setIsMutualSoulmate] = useState(false);
    const [isMutualEnemy, setIsMutualEnemy] = useState(false);
    const [skippedUsers, setSkippedUsers] = useState([]);
    const [userSongs, setUserSongs] = useState([]);

    const resetInactivityTimer = () => setLastActivity(Date.now());

    useEffect(() => {
        if (!user) return;

        const fetchMatches = async () => {
            try {
                const userRes = await axios.get(`http://localhost:8080/api/favorites/${user}`);
                const userMap = generateWordMap(userRes.data);
                setUserSongs(userRes.data);

                const othersRes = await axios.get(`http://localhost:8080/api/favorites/all-wordmaps`);
                const othersRaw = Object.entries(othersRes.data);

                const others = [];
                const skipped = [];

                for (const [username, data] of othersRaw) {
                    if (username === user) continue;
                    try {
                        const privacyRes = await axios.get(`http://localhost:8080/api/favorites/privacy/${username}?requester=${user}`);
                        if (privacyRes.status === 200 && privacyRes.data === false) {
                            others.push([username, data]);
                        } else {
                            skipped.push(username);
                        }
                    } catch (err) {
                        skipped.push(username);
                    }
                }

                setSkippedUsers(skipped);

                const scored = others.map(([username, data]) => ({
                    username,
                    favorites: data.favorites,
                    wordMap: data.wordMap,
                    similarity: computeSimilarity(userMap, data.wordMap)
                }));

                if (scored.length === 0) return;

                scored.sort((a, b) => b.similarity - a.similarity);
                const mostSimilar = scored[0];
                const leastSimilar = scored[scored.length - 1];

                setSoulmate(mostSimilar);
                setEnemy(leastSimilar);

                const theirMap = generateWordMap(mostSimilar.favorites);
                const similarityBack = computeSimilarity(theirMap, userMap);
                let mutualSoulmate = true;

                for (const other of scored) {
                    if (
                        other.username !== mostSimilar.username &&
                        computeSimilarity(theirMap, other.wordMap) > similarityBack
                    ) {
                        mutualSoulmate = false;
                        break;
                    }
                }

                const enemyMap = generateWordMap(leastSimilar.favorites);
                const similarityBackFromEnemy = computeSimilarity(enemyMap, userMap);
                let mutualEnemy = true;

                for (const other of scored) {
                    if (
                        other.username !== leastSimilar.username &&
                        computeSimilarity(enemyMap, other.wordMap) < similarityBackFromEnemy
                    ) {
                        mutualEnemy = false;
                        break;
                    }
                }

                setIsMutualSoulmate(mutualSoulmate);
                setIsMutualEnemy(mutualEnemy);

                if (mutualSoulmate) {
                    setCelebration(true);
                    setTimeout(() => setCelebration(false), 4000);
                }
                if (mutualEnemy) {
                    setSinister(true);
                    setTimeout(() => setSinister(false), 4000);
                }
            } catch (err) {
                console.error("❌ Failed to fetch lyrical match data:", err);
            }
        };

        fetchMatches();
    }, [user]);

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

    const generateWordMap = (songs) => {
        const map = {};
        for (const song of songs) {
            const lyrics = song.lyrics.toLowerCase().replace(/[^a-zA-Z\s]/g, "");
            const words = lyrics.split(/\s+/).filter(word => word && !stopWords.has(word));
            for (const word of words) {
                map[word] = (map[word] || 0) + 1;
            }
        }
        return map;
    };

    const computeSimilarity = (mapA, mapB) => {
        const setA = new Set(Object.keys(mapA));
        const setB = new Set(Object.keys(mapB));
        const intersection = [...setA].filter(word => setB.has(word));
        const union = new Set([...setA, ...setB]);
        return intersection.length / union.size;
    };

    const UserComparison = ({ title, user }) => (
        <div className="my-6 p-4 border rounded shadow bg-white">
            <h2 aria-label={`${title}: ${user?.username}`} className="text-xl font-bold mb-2">{`${title}: ${user?.username}`}</h2>
            <h3 aria-label={`their favorite songs:`} className="text-md mb-2">Their Favorite Songs:</h3>
            <ul className="list-disc pl-6">
                {user?.favorites?.map(song => (
                    <li aria-label={`${song.title}, ${song.artistName}`} key={song.songId}>{song.title} — {song.artistName}</li>
                ))}
            </ul>
        </div>
    );
    if (!user) return null;

    return (
        <div onClick={resetInactivityTimer} className="p-6 bg-gray-100 min-h-screen">
            <h1 aria-label={`Find your lyrical soulmate and enemy`} className="text-3xl font-bold mb-4 text-center">🔍 Find Your Lyrical Soulmate & Enemy</h1>

            {skippedUsers.length > 0 && (
                <div aria-label={`skipped users with private favorite lists`} className="mb-4 px-4 py-2 rounded bg-yellow-100 text-yellow-800 border border-yellow-300 shadow-sm">
                    ⚠️ Skipped {skippedUsers.length} user{skippedUsers.length > 1 ? "s" : ""} with private favorites:
                    <ul className="list-disc list-inside mt-1">
                        {skippedUsers.map((u) => (
                            <li aria-label={`user with private favorites: ${u}`} key={u}>{u}</li>
                        ))}
                    </ul>
                </div>
            )}

            <AnimatePresence>
                {celebration && showSoulmate && isMutualSoulmate && (
                    <motion.div
                        data-testid="celebration-overlay"
                        className="fixed top-0 left-0 w-full h-full bg-purple-500/60 z-50 flex items-center justify-center text-white text-4xl font-bold"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        aria-label={`You're each other's lyrical soulmate! overlay`}
                    >
                        🎉 You're each other's lyrical soulmate!
                    </motion.div>
                )}

                {sinister && showEnemy && isMutualEnemy && (
                    <motion.div
                        data-testid="sinister-overlay"
                        className="fixed top-0 left-0 w-full h-full bg-red-900/70 z-50 flex items-center justify-center text-white text-4xl font-bold"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        aria-label={`You're each other's lyrical enemy... overlay`}
                    >
                        😈 You're each other's lyrical enemy...
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex justify-center gap-4 mb-6">
                <button
                    onClick={() => {
                        setShowSoulmate(true);
                        setShowEnemy(false);
                        if (isMutualSoulmate) {
                            setCelebration(true);
                            setTimeout(() => setCelebration(false), 4000);
                        }
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                    aria-label={`show soulmate button`}
                >
                    Show Soulmate
                </button>
                <button
                    onClick={() => {
                        setShowEnemy(true);
                        setShowSoulmate(false);
                        if (isMutualEnemy) {
                            setSinister(true);
                            setTimeout(() => setSinister(false), 4000);
                        }
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    aria-label={`show enemy button`}
                >
                    Show Enemy
                </button>
            </div>

            {showSoulmate && soulmate && (
                <>
                    <UserComparison title="🎵 Your Lyrical Soulmate" user={soulmate} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 aria-label={`your word cloud`} className="text-lg font-semibold mt-4 mb-2 text-center">Your Word Cloud</h3>
                            <WordCloudPanel user={user} wordCloudSongs={userSongs} />
                        </div>
                        <div>
                            <h3 aria-label={`${soulmate.username}'s word cloud`} className="text-lg font-semibold mt-4 mb-2 text-center">{soulmate.username}'s Word Cloud</h3>
                            <WordCloudPanel user={soulmate.username} wordCloudSongs={soulmate.favorites} />
                        </div>
                    </div>
                </>
            )}

            {showEnemy && enemy && (
                <>
                    <UserComparison title="🖤 Your Lyrical Enemy" user={enemy} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 aria-label={`your word cloud`} className="text-lg font-semibold mt-4 mb-2 text-center">Your Word Cloud</h3>
                            <WordCloudPanel user={user} wordCloudSongs={userSongs} />
                        </div>
                        <div>
                            <h3 aria-label={`${enemy.username}'s word cloud`} className="text-lg font-semibold mt-4 mb-2 text-center">{enemy.username}'s Word Cloud</h3>
                            <WordCloudPanel user={enemy.username} wordCloudSongs={enemy.favorites} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default LyricalMatchPage;
