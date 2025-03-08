import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Auth = () => {
    const [isSignup, setIsSignup] = useState(true);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const navigate = useNavigate(); // Use React Router for navigation

    const handleAuth = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (isSignup) {
            if (password !== confirmPassword) {
                setError("Passwords do not match");
                return;
            }
            if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
                setError("Password must contain at least one uppercase letter, one lowercase letter, and one number.");
                return;
            }

            try {
                const response = await axios.post("http://localhost:8080/auth/signup", { username, password });
                setMessage(response.data);
            } catch (err) {
                setError("Username already taken or server error");
            }
        } else {
            try {
                const response = await axios.post("http://localhost:8080/auth/login", { username, password });
                setMessage(response.data);
                if (response.data === "Login successful") {
                    localStorage.setItem("user", username); // Store session
                    navigate("/dashboard"); // Redirect properly using useNavigate
                }
            } catch (err) {
                setError("Invalid username or password");
            }
        }
    };

    return (
        <div style={{ maxWidth: "400px", margin: "auto", textAlign: "center" }}>
            <h2>{isSignup ? "Sign Up" : "Login"}</h2>
            <form onSubmit={handleAuth}>
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                {isSignup && (
                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                )}
                {error && <p style={{ color: "red" }}>{error}</p>}
                {message && <p style={{ color: "green" }}>{message}</p>}
                <button type="submit">{isSignup ? "Sign Up" : "Login"}</button>
            </form>
            <button onClick={() => setIsSignup(!isSignup)}>
                {isSignup ? "Already have an account? Login" : "Don't have an account? Sign up"}
            </button>
        </div>
    );
};

export default Auth;
