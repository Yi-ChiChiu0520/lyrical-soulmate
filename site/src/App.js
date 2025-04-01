import React, { useEffect, useState } from "react";
import { Route, Routes, Navigate } from "react-router-dom";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Favorites from "./pages/Favorites";
import Navbar from "./pages/Navbar";

const App = () => {
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
            {user && <Navbar setUser={setUser} />}
            <Routes>
                <Route path="/" element={<Auth setUser={setUser} />} />
                <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/" replace />} />
                <Route path="/favorites" element={user ? <Favorites user={user} /> : <Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    );
};

export default App;
