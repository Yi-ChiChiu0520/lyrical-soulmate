import React from "react";
import { Link, useNavigate } from "react-router-dom";
import LyricalIcon from "../images/LyricalIcon.png";

const Navbar = ({ setUser }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("user");
        setUser(null);
        navigate("/");
    };

    return (
        <div className="@container bg-[#3d3547] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center">
                <img src={LyricalIcon} alt="Logo" className="h-8 m-2" />
                <div className="font-bold text-xl text-white mr-4">Let's Get Lyrical</div>
                <div className="text-sm bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">Team 28</div>

            </div>
            <nav className="hidden md:block">
                <div className="flex space-x-6 text-lg">
                    <Link to="/dashboard" className="hover:text-purple-300">Dashboard</Link>
                    <Link to="/favorites" className="hover:text-purple-300">Favorites</Link>
                    <Link to="/friends" className="hover:text-purple-300">Friends</Link>
                    <Link to="/match" className="hover:text-purple-300">Lyrical Match</Link>
                </div>
            </nav>
            <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-white"
            >
                Logout
            </button>
        </div>
    );
};

export default Navbar;
