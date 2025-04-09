import React, { useEffect, useState } from "react";
import { Route, Routes, Navigate, useLocation } from "react-router-dom";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Favorites from "./pages/Favorites";
import Navbar from "./pages/Navbar"; //
import FriendsPage from "./pages/FriendsPage";

const App = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        setUser(storedUser);
        setLoading(false);
    }, []);

    if (loading) return null;

    const hideNavbarRoutes = ["/", "/signup"];
    const shouldHideNavbar = hideNavbarRoutes.includes(location.pathname);

    return (
        <>
            {user && !shouldHideNavbar && <Navbar setUser={setUser} />}
            <Routes>
                <Route
                    path="/"
                    element={!user ? <Auth setUser={setUser} isSignup={false} /> : <Navigate to="/dashboard" replace />}
                />
                <Route
                    path="/signup"
                    element={!user ? <Auth setUser={setUser} isSignup={true} /> : <Navigate to="/dashboard" replace />}
                />
                <Route
                    path="/dashboard"
                    element={user ? <Dashboard user={user} /> : <Navigate to="/" replace />}
                />
                <Route
                    path="/favorites"
                    element={user ? <Favorites user={user} /> : <Navigate to="/" replace />}
                />
                <Route
                    path="/friends"
                    element={user ? <FriendsPage user={user} /> : <Navigate to="/" replace />}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    );
};

export default App;
