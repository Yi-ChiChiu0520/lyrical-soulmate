import React, { useEffect, useState } from "react";
import { Route, Routes, Navigate, useLocation } from "react-router-dom";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Favorites from "./pages/Favorites";
import Navbar from "./pages/Navbar";
import FriendsPage from "./pages/FriendsPage";

const App = () => {
    const location = useLocation(); // ✅ now inside the component
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
            {user && location.pathname !== "/" && <Navbar setUser={setUser} />}
            <Routes>
                <Route path="/" element={<Auth setUser={setUser} />} />
                <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/" replace />} />
                <Route path="/favorites" element={user ? <Favorites user={user} /> : <Navigate to="/" replace />} />
                <Route path="/friends" element={user ? <FriendsPage user={user} /> : <Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    );
};

export default App;
