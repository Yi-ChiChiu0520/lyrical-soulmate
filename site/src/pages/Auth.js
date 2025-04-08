import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import LyricalIcon from '../images/LyricalIcon.png';


const Auth = ({ setUser }) => {
    const [isSignup, setIsSignup] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [message, setMessage] = useState("");
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showCancelSignupConfirm, setShowCancelSignupConfirm] = useState(false);

    const navigate = useNavigate();

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
        } else {
            try {
                const response = await axios.post("http://localhost:8080/auth/login", { username, password });

                if (response.data === "Login successful") {
                    localStorage.setItem("user", username);
                    setUser(username); // ✅ update global user state
                    navigate("/dashboard"); // ✅ safe to use here
                }
                else {
                    setError("Login failed. Please try again."); // 👈 this else must exist for coverage
                }
            } catch (err) {
                if (err.response?.status === 423) {
                    setError("Account temporarily locked. Please try again shortly.");
                } else if (err.response?.status === 401 || err.response?.data?.includes("Invalid username or password")) {
                    setError("Invalid username or password");
                } else {
                    setError("Login failed. Please try again.");
                }
            }
        }
    };





    const confirmFinalSignup = () => {
        setShowConfirmation(false);
        setMessage("Signup successful! Please log in.");
        setTimeout(() => {
            setIsSignup(false);
        }, 1500);
    };



    const confirmCancel = async () => {
        try {
            // Delete the user account
            await axios.delete(`http://localhost:8080/auth/delete`, {
                data: { username }
            });
            setShowConfirmation(false);
            setMessage("Account creation cancelled. Your account has been deleted.");
            setIsSignup(false); // Switch to login page
            setUsername(""); // Clear the username field
            setPassword(""); // Clear the password field
            setConfirmPassword(""); // Clear the confirm password fieldf
        } catch (err) {
            setError("Failed to delete account. Please contact support.");
            setShowConfirmation(false);

        }
    };


    return (
        <div className="w-screen h-screen bg-[#e2cdea] text-center flex justify-center items-center">
            <div className="bg-[#2d203f] rounded-lg shadow-lg p-8 w-[400px]">
                <div className="flex flex-col items-center mb-4">
                    <img src={LyricalIcon} alt="Logo" className="h-20 mb-2" />
                    {isSignup ? (
                        <h2 className="text-white font-bold text-2xl text-center" aria-label="Sign Up">  Sign up to find your<br />lyrical soulmate
                        </h2>
                    ) : (
                        <>
                            <h1 className="text-white font-bold text-2xl" aria-label="Login">
                                Log in to Let's Get Lyrical
                            </h1>
                        </>
                    )}
                </div>
                <form
                    className="flex flex-col items-center"
                    onSubmit={handleAuth}>
                    <div className="w-full mb-4 text-left">
                        <label className="text-white py-2">Username</label>
                        <input
                            className="w-full p-2 rounded-md border border-gray-300"
                            id="username"
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="w-full mb-4 text-left">
                        <label className="text-white block mb-1">Password</label>
                        <input
                            className="w-full p-2 rounded-md border border-gray-300"
                            id="password"
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {isSignup && (
                        <div className="w-full mb-4 text-left">
                            <label className="text-white block mb-1">Confirm Password</label>
                            <input
                                className="w-full p-2 rounded-md border border-gray-300"
                                id="confirmPassword"
                                type="password"
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                            {passwordError && <p className="text-red-400 mt-3 -mb-6">{passwordError}</p>}
                        </div>
                    )}
                    {error && <p id="errorMessage" className="text-red-400">{error}</p>}
                    {message && <p id="successMessage" className="text-green-400">{message}</p>}
                    <button
                        className="bg-white text-black font-semibold rounded-full mt-8 py-2 w-32 hover:bg-neutral-200 mt-4"
                        id={isSignup ? "signupButton" : "loginButton"}
                        type="submit"
                        disabled={isSignup && passwordError}
                    >
                        {isSignup ? "Sign Up" : "Login"}
                    </button>
                </form>
                <button className="text-purple-300 mt-8" id="switchSignup" onClick={() => setIsSignup(!isSignup)}>
                    {isSignup ? "Already have an account? Login" : "Don&apos;t have an account? Sign up"}
                </button>

                {isSignup && (
                    <button
                        id="cancelButton"
                        className="text-purple-300 mt-2"
                        onClick={() => {
                            setShowCancelSignupConfirm(true); // <-- show confirmation
                        }}
                    >
                        Cancel sign up and return to login
                    </button>

                )}


                {/* Success Confirmation Modal */}
                {showConfirmation && (
                    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50" >
                        <div className="bg-white p-6 rounded-md shadow-lg text-center">
                            <h3 className="text-lg font-semibold mb-2">Before Signing Up</h3>
                            <p>Are you sure you want to register?</p>
                            <div className="mt-4">
                                <button
                                    id="confirmSignup"
                                    onClick={confirmFinalSignup}
                                    className="mr-3 px-4 py-2 bg-green-500 text-white rounded"
                                >
                                    Yes, Create Account
                                </button>
                                <button
                                    id="cancelSignup"
                                    onClick={confirmCancel}
                                    className="px-4 py-2 bg-red-500 text-white rounded"
                                >
                                    No
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {showCancelSignupConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-md shadow-lg text-center">
                            <h3 className="text-lg font-semibold mb-2">Are you sure you want to cancel account creation?</h3>
                            <div className="mt-4">
                                <button
                                    id="confirmCancel"
                                    onClick={() => {
                                        // Reset everything and switch to login
                                        setShowCancelSignupConfirm(false);
                                        setIsSignup(false);
                                        setUsername("");
                                        setPassword("");
                                        setConfirmPassword("");
                                        setError("");
                                        setPasswordError("");
                                        setMessage("");
                                    }}
                                    className="mr-3 px-4 py-2 bg-green-500 text-white rounded"
                                >
                                    Yes, Cancel Signup
                                </button>
                                <button
                                    id="dontCancel"
                                    onClick={() => setShowCancelSignupConfirm(false)}
                                    className="px-4 py-2 bg-red-500 text-white rounded"
                                >
                                    No
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


export default Auth;