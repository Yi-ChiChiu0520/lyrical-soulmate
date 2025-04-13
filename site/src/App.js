import React, { useEffect, useState } from "react";
import { Route, Routes, Navigate, useLocation } from "react-router-dom";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Favorites from "./pages/Favorites";
import Navbar from "./pages/Navbar";
import FriendsPage from "./pages/FriendsPage";
import LyricalMatchPage from "./pages/LyricalMatchPage";
import Footer from "./pages/Footer.js";

const App = () => {
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        setUser(storedUser);
        setLoading(false);
    }, []);

    if (loading) return null;

    return (
        <>
            <div className="min-h-screen flex flex-col">
            {user && location.pathname !== "/" && <Navbar setUser={setUser} />}
            <Routes>
                <Route path="/" element={<Auth setUser={setUser} />} />
                <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/" replace />} />
                <Route path="/favorites" element={user ? <Favorites user={user} /> : <Navigate to="/" replace />} />
                <Route path="/friends" element={user ? <FriendsPage user={user} /> : <Navigate to="/" replace />} />
                <Route path="/match" element={user ? <LyricalMatchPage user={user} /> : <Navigate to="/" replace />} /> {/* 👈 NEW ROUTE */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {user && location.pathname !== "/" && <Footer />}
            </div>
        </>
    );
};

export default App;
