package edu.usc.csci310.project.repository;

import edu.usc.csci310.project.model.User;
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
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
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

        String sql = "INSERT INTO users (username, raw_username, password) VALUES (?, ?, ?)";

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, hashedUsername);
            stmt.setString(2, username); // raw
            stmt.setString(3, password);
            stmt.executeUpdate();
            return true;
        } catch (SQLException e) {
            System.err.println("❌ Error registering user: " + e.getMessage());
            return false;
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


    /**
     * Deletes a user by their username (using hashed username for lookup)
     */
    public boolean deleteByUsername(String username) {
        String hashedUsername = hashUsername(username);
        String sql = "DELETE FROM users WHERE username = ?";




        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, hashedUsername);
            int rowsAffected = stmt.executeUpdate();
            return rowsAffected > 0;
        } catch (SQLException e) {
            System.err.println("❌ Error deleting user: " + e.getMessage());
            return false;
        }
    }

    public Optional<User> findByUsername(String username) {
        String hashedUsername = hashUsername(username);
        String sql = "SELECT * FROM users WHERE username = ?";
        PreparedStatement stmt = null;
        ResultSet rs = null;

        try {
            stmt = connection.prepareStatement(sql);
            stmt.setString(1, hashedUsername);
            rs = stmt.executeQuery();

            if (rs.next()) {
                String password = rs.getString("password");
                int attempts = rs.getInt("failed_login_attempts");
                boolean locked = rs.getBoolean("account_locked");
                java.sql.Timestamp lockTimeStamp = rs.getTimestamp("lock_time");
                LocalDateTime lockTime = lockTimeStamp != null ? lockTimeStamp.toLocalDateTime() : null;

                return Optional.of(new User(hashedUsername, password, attempts, locked, lockTime));
            }
        } catch (SQLException e) {
            System.err.println("❌ Error retrieving user: " + e.getMessage());
        } finally {
            try {
                if (rs != null) rs.close();
            } catch (SQLException e) {
                System.err.println("❌ Error closing ResultSet: " + e.getMessage());
            }
            try {
                if (stmt != null) stmt.close();
            } catch (SQLException e) {
                System.err.println("❌ Error closing PreparedStatement: " + e.getMessage());
            }
        }

        return Optional.empty();
    }

    public boolean updateUser(User user) {
        String sql = "UPDATE users SET password = ?, failed_login_attempts = ?, account_locked = ?, lock_time = ? WHERE username = ?";

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, user.getPassword());
            stmt.setInt(2, user.getFailedLoginAttempts());
            stmt.setBoolean(3, user.isAccountLocked());
            if (user.getLockTime() != null) {
                stmt.setTimestamp(4, java.sql.Timestamp.valueOf(user.getLockTime()));
            } else {
                stmt.setTimestamp(4, null);
            }
            stmt.setString(5, user.getUsername());

            int updated = stmt.executeUpdate();
            return updated > 0;
        } catch (SQLException e) {
            System.err.println("❌ Error updating user: " + e.getMessage());
            return false;
        }
    }
    public List<String> findByRawUsernamePrefix(String prefix) {
        String sql = "SELECT raw_username FROM users WHERE LOWER(raw_username) LIKE ?";
        List<String> result = new ArrayList<>();

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, prefix.toLowerCase() + "%");
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                result.add(rs.getString("raw_username"));
            }
        } catch (SQLException e) {
            System.err.println("❌ Error searching raw usernames: " + e.getMessage());
        }

        return result;
    }

    public Optional<String> getHashedUsernameFromRaw(String rawUsername) {
        String sql = "SELECT username FROM users WHERE raw_username = ?";
        PreparedStatement stmt = null;
        ResultSet rs = null;

        try {
            stmt = connection.prepareStatement(sql);
            stmt.setString(1, rawUsername);
            rs = stmt.executeQuery();
            if (rs.next()) {
                return Optional.of(rs.getString("username"));
            }
        } catch (SQLException e) {
            System.err.println("❌ Error mapping raw to hashed username: " + e.getMessage());
        } finally {
            try {
                if (rs != null) rs.close();
            } catch (SQLException e) {
                System.err.println("❌ Failed to close ResultSet: " + e.getMessage());
            }
            try {
                if (stmt != null) stmt.close();
            } catch (SQLException e) {
                System.err.println("❌ Failed to close PreparedStatement: " + e.getMessage());
            }
        }

        return Optional.empty();
    }


    public Optional<String> getRawUsernameFromHashed(String hashedUsername) {
        String sql = "SELECT raw_username FROM users WHERE username = ?";
        PreparedStatement stmt = null;
        ResultSet rs = null;

        try {
            stmt = connection.prepareStatement(sql);
            stmt.setString(1, hashedUsername);
            rs = stmt.executeQuery();
            if (rs.next()) {
                return Optional.of(rs.getString("raw_username"));
            }
        } catch (SQLException e) {
            System.err.println("❌ Error getting raw username: " + e.getMessage());
        } finally {
            try {
                if (rs != null) rs.close();
            } catch (SQLException e) {
                System.err.println("❌ Failed to close ResultSet: " + e.getMessage());
            }
            try {
                if (stmt != null) stmt.close();
            } catch (SQLException e) {
                System.err.println("❌ Failed to close PreparedStatement: " + e.getMessage());
            }
        }

        return Optional.empty();
    }
}
