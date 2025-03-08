package edu.usc.csci310.project.controller;

import edu.usc.csci310.project.services.AuthService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public String signup(@RequestBody Map<String, String> request) {
        return authService.registerUser(request.get("username"), request.get("password"));
    }

    @PostMapping("/login")
    public String login(@RequestBody Map<String, String> request, HttpSession session) {
        boolean isAuthenticated = authService.authenticateUser(request.get("username"), request.get("password"));
        if (isAuthenticated) {
            session.setAttribute("user", request.get("username"));
            return "Login successful";
        } else {
            return "Invalid username or password";
        }
    }

    @PostMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "Logged out successfully";
    }
}