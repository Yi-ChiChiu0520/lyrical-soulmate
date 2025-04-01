package edu.usc.csci310.project.services;

import edu.usc.csci310.project.model.User;
import edu.usc.csci310.project.repository.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private static final int MAX_FAILED_ATTEMPTS = 3;
    private static final int LOCK_DURATION_SECONDS = 30;

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

        String hashed = passwordEncoder.encode(password);
        boolean success = userRepository.registerUser(username, hashed);
        if (success) {
            System.out.println("✅ User registered successfully: " + username);
            return "User registered successfully";
        } else {
            System.err.println("❌ Error inserting user into the database.");
            return "Error registering user";
        }
    }

    public int loginWithLockout(String username, String password) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) return 401;

        User user = userOpt.get();
        System.out.println("👉 Input password: " + password);
        System.out.println("👉 Stored hash: " + user.getPassword());
        System.out.println("👉 Account locked: " + user.isAccountLocked());
        System.out.println("👉 Failed attempts: " + user.getFailedLoginAttempts());

        if (user.isAccountLocked()) {
            if (Duration.between(user.getLockTime(), LocalDateTime.now()).getSeconds() < LOCK_DURATION_SECONDS) {
                return 423; // Locked
            } else {
                // Unlock after duration
                user.setAccountLocked(false);
                user.setFailedLoginAttempts(0);
                user.setLockTime(null);
            }
        }

        if (passwordEncoder.matches(password, user.getPassword())) { // ✅ Correct
            System.out.println("✅ Password match!");

            user.setFailedLoginAttempts(0);
            user.setAccountLocked(false);
            user.setLockTime(null);
            userRepository.updateUser(user);
            return 200;
        } else {
            System.out.println("❌ Password mismatch!");

            int attempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(attempts);
            if (attempts >= MAX_FAILED_ATTEMPTS) {
                user.setAccountLocked(true);
                user.setLockTime(LocalDateTime.now());
            }
            userRepository.updateUser(user);
            return 401;
        }
    }


    public boolean deleteUser(String username) {
        try {
            boolean deleted = userRepository.deleteByUsername(username);
            if (deleted) {
                System.out.println("✅ User deleted successfully: " + username);
                return true;
            } else {
                System.err.println("❌ User not found for deletion: " + username);
                return false;
            }
        } catch (Exception e) {
            System.err.println("❌ Error deleting user: " + username);
            e.printStackTrace();
            return false;
        }
    }
}
