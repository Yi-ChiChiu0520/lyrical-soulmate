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
                if (response.data === "Login successful") {
                    setMessage(response.data);
                    localStorage.setItem("user", username);
                    navigate("/dashboard");
                } else if (response.data === "Invalid username or password") {
                    setError(response.data);
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
        <div className="w-screen h-screen bg-fuchsia-950 text-center flex justify-center items-center flex-col">
            <div className="w-3/4 h-1/2 my-10 flex justify-center items-center flex-col">
                <div className="m-10">
                    <h1 className="font-bold text-3xl text-white">Let’s Get Lyrical!</h1>
                </div>
                <form
                    className="flex justify-center items-center flex-col w-full max-w-3xl min-w-96 bg-fuchsia-900 p-10 rounded-xl mb-10"
                    onSubmit={handleAuth}>
                    <h2 className="text-white mb-5 font-bold text-2xl">{isSignup ? "Sign Up" : "Login"}</h2>
                    <div className="mb-10 max-w-3xl min-w-80 w-2/3 flex justify-center items-start flex-col">
                        <label className="text-white py-2">Username</label>
                        <input
                            className="w-full p-2 rounded-md"
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

                {/* Signup Agreement Modal */}
                {showAgreement && (
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
                        <h3>Before Signing Up</h3>
                        <p>I would like to sign up. Do you agree?</p>
                        <button onClick={confirmSignup} className="my-4 p-1 mr-3">Yes, Create Account</button>
                        <button onClick={cancelAgreement} className="my-4 p-1 text-red-400">No, Cancel</button>
                    </div>
                )}

                {/* Final Confirmation Modal */}
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
                        <h3>Account Created!</h3>
                        <p>Would you like to proceed to login?</p>
                        <button onClick={confirmFinalSignup} className="mr-3">Yes, Log in</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Auth;
