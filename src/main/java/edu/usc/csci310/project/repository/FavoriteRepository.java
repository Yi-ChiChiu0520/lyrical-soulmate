package edu.usc.csci310.project.repository;

import edu.usc.csci310.project.model.FavoriteSong;
import edu.usc.csci310.project.util.EncryptionUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

@Repository
public class FavoriteRepository {

    private final Connection connection;

    @Autowired
    public FavoriteRepository(Connection connection) {
        this.connection = connection;
    }

    /**
     * Hash the username using SHA-256 for privacy.
     */
    private String hashUsername(String username) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(username.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                hexString.append(String.format("%02x", b));
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Error hashing username", e);
        }
    }

    /**
     * Adds a song to the user's favorite list.
     */
    public boolean addFavorite(String username, String songId, String title, String url, String imageUrl, String releaseDate, String artistName) {
        int rank = getNextRank(username); // ✅ Ensure a valid rank is assigned
        String hashedUsername = hashUsername(username);

        // Encrypt sensitive data
        String encryptedTitle = EncryptionUtil.encrypt(title);
        String encryptedUrl = EncryptionUtil.encrypt(url);
        String encryptedImageUrl = EncryptionUtil.encrypt(imageUrl);
        String encryptedReleaseDate = EncryptionUtil.encrypt(releaseDate);
        String encryptedArtistName = EncryptionUtil.encrypt(artistName);

        String sql = "INSERT INTO favorites (username, song_id, title, url, image_url, release_date, artist_name, rank) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, hashedUsername);
            stmt.setString(2, songId);
            stmt.setString(3, encryptedTitle);
            stmt.setString(4, encryptedUrl);
            stmt.setString(5, encryptedImageUrl);
            stmt.setString(6, encryptedReleaseDate);
            stmt.setString(7, encryptedArtistName);
            stmt.setInt(8, rank);  // ✅ Assign the next available rank
            stmt.executeUpdate();
            System.out.println("✅ Added song with rank: " + rank);
            return true;
        } catch (SQLException e) {
            System.err.println("❌ Error adding to favorites: " + e.getMessage());
            return false;
        }
    }

    /**
     * Retrieves a user's favorite songs in order of rank.
     */
    public List<FavoriteSong> getFavorites(String username) {
        List<FavoriteSong> favorites = new ArrayList<>();
        String hashedUsername = hashUsername(username);

        String sql = "SELECT song_id, title, url, image_url, release_date, artist_name, COALESCE(rank, 1) AS rank FROM favorites WHERE username = ? ORDER BY rank ASC";

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, hashedUsername);
            ResultSet rs = stmt.executeQuery();

            while (rs.next()) {
                int rank = rs.getInt("rank");
                if (rank < 1) { // ✅ Ensure rank is always valid
                    rank = 1;
                }
                System.out.println("📥 Retrieved song with rank: " + rank); // Debugging log

                // Decrypt sensitive data
                String decryptedTitle = EncryptionUtil.decrypt(rs.getString("title"));
                String decryptedUrl = EncryptionUtil.decrypt(rs.getString("url"));
                String decryptedImageUrl = EncryptionUtil.decrypt(rs.getString("image_url"));
                String decryptedReleaseDate = EncryptionUtil.decrypt(rs.getString("release_date"));
                String decryptedArtistName = EncryptionUtil.decrypt(rs.getString("artist_name"));

                FavoriteSong song = new FavoriteSong(
                        hashedUsername,
                        rs.getString("song_id"),
                        decryptedTitle,
                        decryptedUrl,
                        decryptedImageUrl,
                        decryptedReleaseDate,
                        decryptedArtistName,
                        rank  // ✅ Assign a valid rank
                );
                favorites.add(song);
            }
        } catch (SQLException e) {
            System.err.println("❌ Error retrieving favorites: " + e.getMessage());
        }
        return favorites;
    }

    // Other methods remain unchanged...


    /**
     * Removes a song from the user's favorite list.
     */
    public boolean removeFavorite(String username, String songId) {
        String hashedUsername = hashUsername(username);
        String sql = "DELETE FROM favorites WHERE username = ? AND song_id = ?";

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, hashedUsername);
            stmt.setString(2, songId);

            int affectedRows = stmt.executeUpdate();
            System.out.println("🔄 DELETE Query executed. Affected Rows: " + affectedRows); // Debugging log

            return affectedRows > 0;
        } catch (SQLException e) {
            System.err.println("❌ Database error removing favorite: " + e.getMessage());
            return false;
        }
    }
    /**
     * Updates the rank of two songs to swap their positions.
     */
    public boolean swapRanks(String username, int rank1, int rank2) {
        String hashedUsername = hashUsername(username);

        try {
            connection.setAutoCommit(false); // Begin transaction

            // Step 1: Move rank1 to a temporary unique value (-rank1)
            String tempUpdate = "UPDATE favorites SET rank = ? WHERE username = ? AND rank = ?";
            try (PreparedStatement stmt = connection.prepareStatement(tempUpdate)) {
                stmt.setInt(1, -rank1);
                stmt.setString(2, hashedUsername);
                stmt.setInt(3, rank1);
                stmt.executeUpdate();
            }

            // Step 2: Move rank2 to rank1's original position
            String updateRank2 = "UPDATE favorites SET rank = ? WHERE username = ? AND rank = ?";
            try (PreparedStatement stmt = connection.prepareStatement(updateRank2)) {
                stmt.setInt(1, rank1);
                stmt.setString(2, hashedUsername);
                stmt.setInt(3, rank2);
                stmt.executeUpdate();
            }

            // Step 3: Move temporary value to rank2's original position
            String updateTemp = "UPDATE favorites SET rank = ? WHERE username = ? AND rank = ?";
            try (PreparedStatement stmt = connection.prepareStatement(updateTemp)) {
                stmt.setInt(1, rank2);
                stmt.setString(2, hashedUsername);
                stmt.setInt(3, -rank1);
                stmt.executeUpdate();
            }

            connection.commit(); // Commit transaction
            return true;
        } catch (SQLException e) {
            try {
                connection.rollback();
            } catch (SQLException ex) {
                System.err.println("Rollback failed: " + ex.getMessage());
            }
            System.err.println("Error swapping ranks: " + e.getMessage());
            return false;
        } finally {
            try {
                connection.setAutoCommit(true);
            } catch (SQLException e) {
                System.err.println("Error resetting auto-commit: " + e.getMessage());
            }
        }
    }

    /**
     * Get the next available rank for a new favorite song.
     */
    private int getNextRank(String username) {
        String hashedUsername = hashUsername(username); // Ensure consistent hashing

        String sql = "SELECT COALESCE(MAX(rank), 0) FROM favorites WHERE username = ?"; // ✅ Ensure no NULL issues
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, hashedUsername);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                int nextRank = rs.getInt(1) + 1; // ✅ Always returns a valid integer
                System.out.println("📤 Assigning new rank: " + nextRank);
                return nextRank > 0 ? nextRank : 1; // Ensure rank is never negative
            }
        } catch (SQLException e) {
            System.err.println("❌ Error fetching next rank: " + e.getMessage());
        }
        return 1; // ✅ Default rank if no previous entries
    }


}
