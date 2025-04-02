import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";


const Auth = ({ setUser }) => {
    const [isSignup, setIsSignup] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [message, setMessage] = useState("");
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
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
            setShowCancelConfirm(false);
            setShowConfirmation(false);
            setMessage("Account creation cancelled. Your account has been deleted.");
            setIsSignup(false); // Switch to login page
            setUsername(""); // Clear the username field
            setPassword(""); // Clear the password field
            setConfirmPassword(""); // Clear the confirm password field
        } catch (err) {
            setError("Failed to delete account. Please contact support.");
            setShowCancelConfirm(false);
            setShowConfirmation(false);

        }
    };


    return (
        <div className="w-screen h-screen bg-fuchsia-950 text-center flex justify-center items-center flex-col">
            <div className="w-3/4 h-1/2 my-10 flex justify-center items-center flex-col">
                <div className="m-10">
                    <h1 className="font-bold text-3xl text-white">Let's Get Lyrical!</h1>
                </div>
                <form
                    className="flex justify-center items-center flex-col w-full max-w-3xl min-w-96 bg-fuchsia-900 p-10 rounded-xl mb-10"
                    onSubmit={handleAuth}>
                    <h2 className="text-white mb-5 font-bold text-2xl">{isSignup ? "Sign Up" : "Login"}</h2>
                    <div className="mb-10 max-w-3xl min-w-80 w-2/3 flex justify-center items-start flex-col">
                        <label className="text-white py-2">Username</label>
                        <input
                            className="w-full p-2 rounded-md"
                            id="username"
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                         />
                    </div>
                    <div className="mb-10 max-w-3xl min-w-80 w-2/3 flex justify-center items-start flex-col">
                        <label className="text-white py-2">Password</label>
                        <input
                            className="w-full p-2 rounded-md"
                            id="password"
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {isSignup && (
                        <div className="mb-10 max-w-3xl min-w-80 w-2/3 flex justify-center items-start flex-col">
                            <label className="text-white py-2">Confirm Password</label>
                            <input
                                className="w-full p-2 rounded-md"
                                id="confirmPassword"
                                type="password"
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                            {passwordError && <p className="py-3 text-red-400">{passwordError}</p>}
                        </div>
                    )}
                    {error && <p id="errorMessage" className="text-red-400">{error}</p>}
                    {message && <p id="successMessage" className="text-green-400">{message}</p>}
                    <button
                        className="rounded-full bg-white hover:bg-neutral-200 p-2 w-40 mt-10"
                        id={isSignup ? "signupButton" : "loginButton"}
                        type="submit"
                        disabled={isSignup && passwordError}
                    >
                        {isSignup ? "Sign Up" : "Login"}
                    </button>
                </form>
                <button className="text-white" id="switchSignup" onClick={() => setIsSignup(!isSignup)}>
                    {isSignup ? "Already have an account? Login" : "Don't have an account? Sign up"}
                </button>

                {isSignup && (
                    <button
                        id="cancelButton"
                        className="text-white mt-2 underline hover:text-gray-200"
                        onClick={() => {
                            setShowCancelSignupConfirm(true); // <-- show confirmation
                        }}
                    >
                        Cancel and go back to login
                    </button>

                )}


                {/* Success Confirmation Modal */}
                {showConfirmation && (
                    <div className="rounded-md p-5" style={{
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
                        <h3>Are you sure you want to register?</h3>
                        <div className="mt-4">
                            <button
                                id="confirmSignup"
                                onClick={confirmFinalSignup}
                                className="mr-3 bg-fuchsia-900 text-white p-2 rounded-md hover:bg-fuchsia-800"
                            >
                                Yes
                            </button>
                            <button
                                id="cancelSignup"
                                onClick={confirmCancel}
                                className="bg-gray-300 text-gray-800 p-2 rounded-md hover:bg-gray-400"
                            >
                                No
                            </button>
                        </div>
                    </div>
                )}
                {showCancelSignupConfirm && (
                    <div className="rounded-md p-5" style={{
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
                        <h3>Are you sure you want to cancel account creation?</h3>
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
                                className="mr-3 bg-fuchsia-900 text-white p-2 rounded-md hover:bg-fuchsia-800"
                            >
                                Yes
                            </button>
                            <button
                                id="dontCancel"
                                onClick={() => setShowCancelSignupConfirm(false)}
                                className="bg-gray-300 text-gray-800 p-2 rounded-md hover:bg-gray-400"
                            >
                                No
                            </button>
                        </div>
                    </div>
                )}




            </div>
        </div>
    );
};


export default Auth;