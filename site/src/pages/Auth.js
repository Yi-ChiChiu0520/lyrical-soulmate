import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Auth = () => {
    const [isSignup, setIsSignup] = useState(false); // Default to Login page
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [message, setMessage] = useState("");
    const [showAgreement, setShowAgreement] = useState(false); // Agreement step
    const [showConfirmation, setShowConfirmation] = useState(false); // Final confirmation after signup

    const navigate = useNavigate();

    // Real-time password validation
    useEffect(() => {
        if (isSignup && confirmPassword) {
            setPasswordError(password !== confirmPassword ? "Passwords do not match" : "");
        } else {
            setPasswordError("");
        }
    }, [password, confirmPassword, isSignup]);

    const handleAuth = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (isSignup) {
            if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
                setError("Password must contain at least one uppercase letter, one lowercase letter, and one number.");
                return;
            }

            // Show agreement modal before creating account
            setShowAgreement(true);
        } else {
            try {
                const response = await axios.post("http://localhost:8080/auth/login", { username, password });
                setMessage(response.data);
                if (response.data === "Login successful") {
                    localStorage.setItem("user", username);
                    navigate("/dashboard");
                }
            } catch (err) {
                setError("Invalid username or password");
            }
        }
    };

    // If user agrees, proceed with account creation
    const confirmSignup = async () => {
        setShowAgreement(false);
        setError(""); // Clear previous errors
        try {
            const response = await axios.post("http://localhost:8080/auth/signup", { username, password });

            if (response.data.includes("User registered successfully")) {
                setShowConfirmation(true);
            } else if (response.data.includes("Username already taken")) {
                setError("Username already taken");
            } else {
                setError("Server error, please try again.");
            }
        } catch (err) {
            setError("Username already taken or server error");
        }
    };

    // If user cancels, go back to signup form
    const cancelAgreement = () => {
        setShowAgreement(false);
    };

    // Final confirmation after account creation
    const confirmFinalSignup = () => {
        setShowConfirmation(false);
        setMessage("Signup successful! Please log in.");
        setIsSignup(false); // Switch to login after confirmation
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
                    <>
                        <input
                            type="password"
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                        {passwordError && <p style={{ color: "red" }}>{passwordError}</p>}
                    </>
                )}
                {error && <p id="errorMessage" style={{ color: "red" }}>{error}</p>}
                {message && <p id="successMessage" style={{ color: "green" }}>{message}</p>}
                <button
                    id={isSignup ? "signupButton" : "loginButton"}
                    type="submit"
                    disabled={isSignup && passwordError}
                >
                    {isSignup ? "Sign Up" : "Login"}
                </button>
            </form>
            <button id="switchSignup" onClick={() => setIsSignup(!isSignup)}>
                {isSignup ? "Already have an account? Login" : "Don't have an account? Sign up"}
            </button>

            {/* Signup Agreement Modal */}
            {showAgreement && (
                <div style={{
                    position: "fixed",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    background: "white",
                    padding: "20px",
                    boxShadow: "0px 0px 10px gray",
                    textAlign: "center",
                    zIndex: 1000
                }}>
                    <h3>Before Signing Up</h3>
                    <p>I would like to sign up. Do you agree?</p>
                    <button onClick={confirmSignup} style={{ marginRight: "10px" }}>Yes, Create Account</button>
                    <button onClick={cancelAgreement} style={{ background: "red", color: "white" }}>No, Cancel</button>
                </div>
            )}

            {/* Final Confirmation Modal */}
            {showConfirmation && (
                <div style={{
                    position: "fixed",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    background: "white",
                    padding: "20px",
                    boxShadow: "0px 0px 10px gray",
                    textAlign: "center",
                    zIndex: 1000
                }}>
                    <h3>Account Created!</h3>
                    <p>Would you like to proceed to login?</p>
                    <button onClick={confirmFinalSignup} style={{ marginRight: "10px" }}>Yes, Log in</button>
                </div>
            )}
        </div>
    );
};

export default Auth;
