import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

// Common words we want to ignore when analyzing lyrics (stop words)
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

    useEffect(() => {
        if (!user) return;
        const fetchMatches = async () => {
            try {
                // Step 1: Get current user's favorite songs and generate word map
                const userRes = await axios.get(`http://localhost:8080/api/favorites/${user}`);
                const userMap = generateWordMap(userRes.data);

                // Step 2: Get all other users' word maps and favorites
                const othersRes = await axios.get(`http://localhost:8080/api/favorites/all-wordmaps`);
                const others = Object.entries(othersRes.data).filter(([username]) => username !== user);

                // Step 3: Compute similarity for each other user
                const scored = others.map(([username, data]) => ({
                    username,
                    favorites: data.favorites,
                    wordMap: data.wordMap,
                    similarity: computeSimilarity(userMap, data.wordMap)
                }));

                if (scored.length === 0) return;

                // Step 4: Sort by similarity descending
                scored.sort((a, b) => b.similarity - a.similarity);
                const mostSimilar = scored[0];
                const leastSimilar = scored[scored.length - 1];

                setSoulmate(mostSimilar);
                setEnemy(leastSimilar);

                // Step 5: Check for mutual soulmate
                const theirMap = generateWordMap(mostSimilar.favorites);
                const similarityBack = computeSimilarity(theirMap, userMap);
                let isMutualSoulmate = true;

                for (const other of scored) {
                    //Is there someone else who is even more similar to them than I am?
                    //If your top lyrical match actually likes someone else more than they like you, then they’re not really your soulmate.
                    /*
                    other.username !== mostSimilar.username
                    You're looping through all users.
                    This makes sure you're not comparing mostSimilar to themselves.

                    ✅ computeSimilarity(theirMap, other.wordMap) > similarityBack
                    theirMap: the word map of the person who was your most similar match.
                    other.wordMap: the word map of some other user (we’re looping through all others).
                    similarityBack: how similar your word map is to theirMap.
                    */

                    if (
                        other.username !== mostSimilar.username &&
                        computeSimilarity(theirMap, other.wordMap) > similarityBack
                    ) {
                        isMutualSoulmate = false;
                        break;
                    }
                }

                // Step 6: Check for mutual enemy
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

                // Step 7: Animate overlays with delay if needed
                // Step 7: Animate overlays with delay if needed
                if (isMutualSoulmate && isMutualEnemy) {
                    setCelebration(true);
                    setTimeout(() => {
                        setCelebration(false);
                        setSinister(true);
                        setTimeout(() => setSinister(false), 4000);
                    }, 4000);
                }

                // If only a mutual soulmate (and NOT mutual enemy)
                if (isMutualSoulmate && !isMutualEnemy) {
                    setCelebration(true);
                    setTimeout(() => setCelebration(false), 4000);
                }

                // If only a mutual enemy (and NOT mutual soulmate)
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

    // Generates a word frequency map from song lyrics
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

    // Computes Jaccard similarity: (intersection) / (union)
    const computeSimilarity = (mapA, mapB) => {
        const setA = new Set(Object.keys(mapA));
        const setB = new Set(Object.keys(mapB));
        const intersection = [...setA].filter(word => setB.has(word));
        const union = new Set([...setA, ...setB]);
        return intersection.length / union.size;
    };

    // Renders a card for a matched user and their favorite songs
    const UserComparison = ({ title, user }) => (
        <div className="my-6 p-4 border rounded shadow bg-white">
            <h2 className="text-xl font-bold mb-2">{title}: {user?.username}</h2>
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

            {/* 🎉 Celebration overlay */}
            <AnimatePresence>
                {celebration && (
                    <motion.div
                        className="fixed top-0 left-0 w-full h-full bg-purple-500/60 z-50 flex items-center justify-center text-white text-4xl font-bold"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        🎉 You're each other's lyrical soulmate!
                    </motion.div>
                )}

                {sinister && (
                    <motion.div
                        data-testid="sinister-overlay" // ✅ THIS LINE is absolutely critical
                        className="fixed top-0 left-0 w-full h-full bg-red-900/70 z-50 flex items-center justify-center text-white text-4xl font-bold"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        😈 You're each other's lyrical enemy...
                    </motion.div>
                )}

            </AnimatePresence>

            {/* Match Results */}
            {soulmate && <UserComparison title="🎵 Your Lyrical Soulmate" user={soulmate} />}
            {enemy && <UserComparison title="🖤 Your Lyrical Enemy" user={enemy} />}
        </div>
    );


};

export default LyricalMatchPage;
