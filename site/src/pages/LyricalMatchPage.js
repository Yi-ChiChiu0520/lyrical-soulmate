import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

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
    const resetInactivityTimer = () => setLastActivity(Date.now());

    const [showSoulmate, setShowSoulmate] = useState(false);
    const [showEnemy, setShowEnemy] = useState(false);

    useEffect(() => {
        if (!user) return;
        const fetchMatches = async () => {
            try {
                const userRes = await axios.get(`http://localhost:8080/api/favorites/${user}`);
                const userMap = generateWordMap(userRes.data);

                const othersRes = await axios.get(`http://localhost:8080/api/favorites/all-wordmaps`);
                const others = Object.entries(othersRes.data).filter(([username]) => username !== user);

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
                let isMutualSoulmate = true;

                for (const other of scored) {
                    if (
                        other.username !== mostSimilar.username &&
                        computeSimilarity(theirMap, other.wordMap) > similarityBack
                    ) {
                        isMutualSoulmate = false;
                        break;
                    }
                }

                const enemyMap = generateWordMap(leastSimilar.favorites);
                const similarityBackFromEnemy = computeSimilarity(enemyMap, userMap);
                let isMutualEnemy = true;

                for (const other of scored) {
                    if (
                        other.username !== leastSimilar.username &&
                        computeSimilarity(enemyMap, other.wordMap) < similarityBackFromEnemy
                    ) {
                        isMutualEnemy = false;
                        break;
                    }
                }

                if (isMutualSoulmate && isMutualEnemy) {
                    setCelebration(true);
                    setTimeout(() => {
                        setCelebration(false);
                        setSinister(true);
                        setTimeout(() => setSinister(false), 4000);
                    }, 4000);
                }

                if (isMutualSoulmate && !isMutualEnemy) {
                    setCelebration(true);
                    setTimeout(() => setCelebration(false), 4000);
                }

                if (isMutualEnemy && !isMutualSoulmate) {
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
            const lyrics = (song.lyrics).toLowerCase().replace(/[^a-zA-Z\s]/g, "");
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
            <h2 className="text-xl font-bold mb-2">
                {`${title}: ${user?.username}`}
            </h2>
            <h3 className="text-md mb-2">Their Favorite Songs:</h3>
            <ul className="list-disc pl-6">
                {user?.favorites?.map(song => (
                    <li key={song.songId}>{song.title} — {song.artistName}</li>
                ))}
            </ul>
        </div>
    );

    return (
        <div onClick={resetInactivityTimer} className="p-6 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-center">🔍 Find Your Lyrical Soulmate & Enemy</h1>

            <AnimatePresence>
                {celebration && showSoulmate && (
                    <motion.div
                        className="fixed top-0 left-0 w-full h-full bg-purple-500/60 z-50 flex items-center justify-center text-white text-4xl font-bold"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        🎉 You're each other's lyrical soulmate!
                    </motion.div>
                )}

                {sinister && showEnemy && (
                    <motion.div
                        data-testid="sinister-overlay"
                        className="fixed top-0 left-0 w-full h-full bg-red-900/70 z-50 flex items-center justify-center text-white text-4xl font-bold"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
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
                        setCelebration(true);
                        setTimeout(() => setCelebration(false), 4000);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                    Show Soulmate
                </button>
                <button
                    onClick={() => {
                        setShowEnemy(true);
                        setShowSoulmate(false);
                        setSinister(true);
                        setTimeout(() => setSinister(false), 4000);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    Show Enemy
                </button>
            </div>

            {showSoulmate && soulmate && (
                <UserComparison title="🎵 Your Lyrical Soulmate" user={soulmate} />
            )}
            {showEnemy && enemy && (
                <UserComparison title="🖤 Your Lyrical Enemy" user={enemy} />
            )}
        </div>
    );
};

export default LyricalMatchPage;
