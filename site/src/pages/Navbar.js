import React from "react";
import { Link, useNavigate } from "react-router-dom";

const Navbar = ({ setUser }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("user");
        setUser(null); // 🔁 Clear user state in App
        navigate("/");
    };

    return (
        <nav style={{ display: "flex", justifyContent: "space-between", padding: "10px 20px", backgroundColor: "#333", color: "#fff" }}>
            <div>
                <Link to="/dashboard" style={{ color: "white", marginRight: "20px", textDecoration: "none" }}>Dashboard</Link>
                <Link to="/favorites" style={{ color: "white", textDecoration: "none" }}>Favorites</Link>
            </div>
            <button
                onClick={handleLogout}
                style={{ background: "red", color: "white", padding: "5px 10px", border: "none", cursor: "pointer" }}
            >
                Logout
            </button>
        </nav>
    );
};

export default Navbar;
