import React from "react";
import { Link, useNavigate } from "react-router-dom";

const Navbar = ({ setUser }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("user");
        setUser(null);
        navigate("/");
    };

    return (
        <nav className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center shadow-md">
            <div className="space-x-6 text-lg">
                <Link to="/dashboard" className="hover:text-purple-400">Dashboard</Link>
                <Link to="/favorites" className="hover:text-purple-400">Favorites</Link>
                <Link to="/friends" className="hover:text-purple-400">Friends</Link>
                <Link to="/match" className="hover:text-purple-400">Lyrical Match</Link>
            </div>
            <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-white"
            >
                Logout
            </button>
        </nav>
    );
};

export default Navbar;
