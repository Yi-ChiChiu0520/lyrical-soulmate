import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import LyricalIcon from "../images/LyricalIcon.png";

const Navbar = ({ setUser }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("user");
        setUser(null);
        navigate("/");
    };

    return (
        <div className="bg-[#3d3547] text-white px-4 py-3 flex items-center justify-between">
            {/* Left Logo and Title */}
            <div className="flex items-center space-x-3">
                <img src={LyricalIcon} alt="Logo" className="h-8 m-2" />
                <div aria-label={`Let's get lyrical title`} className="font-bold text-xl text-white">Let's Get Lyrical</div>
                <div aria-label={`Team 28 team name`} className="text-sm bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">Team 28</div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex space-x-6 text-lg">
                <Link aria-label={`Link to dashboard page`} to="/dashboard" className="hover:text-purple-300">Dashboard</Link>
                <Link aria-label={`Link to favorites page`} id="favorites-button" to="/favorites" className="hover:text-purple-300">Favorites</Link>
                <Link aria-label={`Link to compare page`} to="/compare" className="hover:text-purple-300">Compare</Link>
                <Link aria-label={`Link to lyrical match page`} to="/match" className="hover:text-purple-300">Lyrical Match</Link>
            </nav>

            {/* Mobile Hamburger Icon */}
            <div className="md:hidden">
                <button aria-label={`menu for mobile screen`} onClick={() => setMenuOpen(!menuOpen)}>
                    {menuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Logout (always visible on right for md+) */}
            <button
                onClick={handleLogout}
                className="hidden md:inline-block bg-red-500 hover:bg-red-600 px-4 py-2 ml-4 rounded"
                aria-label={`logout button`}
            >
                Logout
            </button>

            {/* Mobile Dropdown Menu */}
            {menuOpen && (
                <div
                    data-testid="mobile-menu"
                    className="absolute top-16 right-4 bg-[#3d3547] text-white border border-purple-200 rounded-lg shadow-md z-50 flex flex-col w-48 py-2 md:hidden"
                >
                    <Link
                        to="/dashboard"
                        data-testid="mobile-link-dashboard"
                        className="px-4 py-2 hover:bg-purple-600"
                        onClick={() => setMenuOpen(false)}
                        aria-label={`link to dashboard page, mobile view`}
                    >
                        Dashboard
                    </Link>
                    <Link
                        to="/favorites"
                        data-testid="mobile-link-favorites"
                        className="px-4 py-2 hover:bg-purple-600"
                        onClick={() => setMenuOpen(false)}
                        aria-label={`link to favorites page, mobile view`}
                    >
                        Favorites
                    </Link>
                    <Link
                        to="/compare"
                        data-testid="mobile-link-compare"
                        className="px-4 py-2 hover:bg-purple-600"
                        onClick={() => setMenuOpen(false)}
                        aria-label={`link to compare page, mobile view`}
                    >
                        Compare
                    </Link>
                    <Link
                        to="/match"
                        data-testid="mobile-link-match"
                        className="px-4 py-2 hover:bg-purple-600"
                        onClick={() => setMenuOpen(false)}
                        aria-label={`link to lyrical match page, mobile view`}
                    >
                        Lyrical Match
                    </Link>
                    <button
                        data-testid="mobile-logout"
                        onClick={() => {
                            setMenuOpen(false);
                            handleLogout();
                        }}
                        className="px-4 py-2 text-left hover:bg-red-600"
                        aria-label={`logout button, mobile view`}
                    >
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
};

export default Navbar;
