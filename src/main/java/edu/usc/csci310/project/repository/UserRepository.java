package edu.usc.csci310.project.repository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Repository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;

import static edu.usc.csci310.project.util.HashUtil.hashUsername;

@Repository
public class UserRepository {

    private final Connection connection;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Autowired
    public UserRepository(Connection connection) {
        this.connection = connection;
    }


    /**
     * Registers a new user with an encrypted username and hashed password.
     */
    public boolean registerUser(String username, String password) {
        String hashedUsername = hashUsername(username);
        String hashedPassword = passwordEncoder.encode(password);

        String sql = "INSERT INTO users (username, password) VALUES (?, ?)";

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, hashedUsername);
            stmt.setString(2, hashedPassword);
            stmt.executeUpdate();
            return true;
        } catch (SQLException e) {
            System.err.println("❌ Error registering user: " + e.getMessage());
            return false; // Username already exists or another issue
        }
    }

    public Optional<String> getUserPassword(String username) {
        String hashedUsername = hashUsername(username);
        String sql = "SELECT password FROM users WHERE username = ?";

        PreparedStatement stmt = null;
        ResultSet rs = null;
        try {
            stmt = connection.prepareStatement(sql);
            stmt.setString(1, hashedUsername);
            rs = stmt.executeQuery();

            if (rs.next()) {
                return Optional.of(rs.getString("password"));
            }
        } catch (SQLException e) {
            System.err.println("Database error occurred: " + e.getMessage());
        } finally {
            try {
                if (rs != null) {
                    rs.close(); // ✅ Ensure ResultSet is closed
                }
            } catch (SQLException ex) {
                System.err.println("Error closing ResultSet: " + ex.getMessage());
            }
            try {
                if (stmt != null) {
                    stmt.close(); // ✅ Ensure PreparedStatement is closed
                }
            } catch (SQLException ex) {
                System.err.println("Error closing PreparedStatement: " + ex.getMessage());
            }
        }
        return Optional.empty();
    }


    /**
     * Checks if a user exists using the hashed username.
     */
    public boolean existsByUsername(String username) {
        String hashedUsername = hashUsername(username);
        String sql = "SELECT 1 FROM users WHERE username = ?";

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, hashedUsername);
            ResultSet rs = stmt.executeQuery();
            return rs.next();
        } catch (SQLException ignored) {}

        return false;
    }

}
