import React from "react";
import {Route, Routes } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";

const App = () => {
    return (
            <Routes>
                <Route path="/" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
    );
};

export default App;
