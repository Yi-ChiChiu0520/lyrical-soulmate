package edu.usc.csci310.project.controller;

import edu.usc.csci310.project.services.AuthService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<String> login(@RequestBody Map<String, String> request, HttpSession session) {
        String username = request.get("username");
        String password = request.get("password");

        System.out.println(username);
        System.out.println(password);

        int resultCode = authService.loginWithLockout(username, password);

        if (resultCode == 200) {
            session.setAttribute("user", username);
            return ResponseEntity.ok("Login successful");
        } else if (resultCode == 423) {
            return ResponseEntity.status(423).body("Account temporarily locked. Please try again shortly.");
        } else {
            return ResponseEntity.status(401).body("Invalid username or password");
        }
    }


    @PostMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "Logged out successfully";
    }

    @DeleteMapping("/delete")
    public String deleteUser(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        boolean deleted = authService.deleteUser(username);
        return deleted ? "User deleted successfully" : "User deletion failed";
    }

}