package edu.usc.csci310.project.services;

import edu.usc.csci310.project.repository.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public String registerUser(String username, String password) {
        if (userRepository.existsByUsername(username)) {
            System.out.println("❌ Username already taken: " + username);
            return "Username already taken";
        }

        if (!password.matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$")) {
            System.out.println("❌ Password does not meet security requirements.");
            return "Password must contain at least one uppercase letter, one lowercase letter, and one number.";
        }

        boolean success = userRepository.registerUser(username, password);
        if (success) {
            System.out.println("✅ User registered successfully: " + username);
            return "User registered successfully";
        } else {
            System.err.println("❌ Error inserting user into the database.");
            return "Error registering user";
        }
    }


    public boolean authenticateUser(String username, String password) {
        Optional<String> hashedPasswordOpt = userRepository.getUserPassword(username);
        return hashedPasswordOpt.isPresent() && passwordEncoder.matches(password, hashedPasswordOpt.get());
    }
}