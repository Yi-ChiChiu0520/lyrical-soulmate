package edu.usc.csci310.project.repository;

import edu.usc.csci310.project.model.FavoriteSong;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

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
     * Adds a song to the user's favorite list (no encryption).
     */
    public boolean addFavorite(String username, String songId, String title, String url, String imageUrl, String releaseDate, String artistName, String lyrics) {
        int rank = getNextRank(username); // ✅ Ensure a valid rank is assigned

        String sql = "INSERT INTO favorites (username, song_id, title, url, image_url, release_date, artist_name, lyrics, rank) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, username);
            stmt.setString(2, songId);
            stmt.setString(3, title);
            stmt.setString(4, url);
            stmt.setString(5, imageUrl);
            stmt.setString(6, releaseDate);
            stmt.setString(7, artistName);
            stmt.setString(8, lyrics);
            stmt.setInt(9, rank);
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

        String sql = "SELECT song_id, title, url, image_url, release_date, artist_name, lyrics, COALESCE(rank, 1) AS rank FROM favorites WHERE username = ? ORDER BY rank ASC";

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, username);
            ResultSet rs = stmt.executeQuery();

            while (rs.next()) {
                int rank = rs.getInt("rank");
                if (rank < 1) rank = 1;

                FavoriteSong song = new FavoriteSong(
                        username,
                        rs.getString("song_id"),
                        rs.getString("title"),
                        rs.getString("url"),
                        rs.getString("image_url"),
                        rs.getString("release_date"),
                        rs.getString("artist_name"),
                        rs.getString("lyrics"),
                        rank
                );
                favorites.add(song);
            }
        } catch (SQLException e) {
            System.err.println("❌ Error retrieving favorites: " + e.getMessage());
        }
        return favorites;
    }

    /**
     * Removes a song from the user's favorite list.
     */
    public boolean removeFavorite(String username, String songId) {
        String sql = "DELETE FROM favorites WHERE username = ? AND song_id = ?";

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, username);
            stmt.setString(2, songId);

            int affectedRows = stmt.executeUpdate();
            System.out.println("🔄 DELETE Query executed. Affected Rows: " + affectedRows);

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
        try {
            connection.setAutoCommit(false);

            String tempUpdate = "UPDATE favorites SET rank = ? WHERE username = ? AND rank = ?";
            try (PreparedStatement stmt = connection.prepareStatement(tempUpdate)) {
                stmt.setInt(1, -rank1);
                stmt.setString(2, username);
                stmt.setInt(3, rank1);
                stmt.executeUpdate();
            }

            String updateRank2 = "UPDATE favorites SET rank = ? WHERE username = ? AND rank = ?";
            try (PreparedStatement stmt = connection.prepareStatement(updateRank2)) {
                stmt.setInt(1, rank1);
                stmt.setString(2, username);
                stmt.setInt(3, rank2);
                stmt.executeUpdate();
            }

            String updateTemp = "UPDATE favorites SET rank = ? WHERE username = ? AND rank = ?";
            try (PreparedStatement stmt = connection.prepareStatement(updateTemp)) {
                stmt.setInt(1, rank2);
                stmt.setString(2, username);
                stmt.setInt(3, -rank1);
                stmt.executeUpdate();
            }

            connection.commit();
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
    /**
     * Get the next available rank for a new favorite song.
     */
    private int getNextRank(String username) {
        final int DEFAULT_RANK = 1;
        String sql = "SELECT COALESCE(MAX(rank), 0) FROM favorites WHERE username = ?";
        PreparedStatement stmt = null;
        ResultSet rs = null;

        try {
            stmt = connection.prepareStatement(sql);
            stmt.setString(1, username);
            rs = stmt.executeQuery();

            if (rs.next()) {
                int maxRank = rs.getInt(1);
                int nextRank = Math.max(maxRank + 1, DEFAULT_RANK);
                System.out.println("📤 Assigning new rank: " + nextRank);
                return nextRank;
            }
            return DEFAULT_RANK;

        } catch (SQLException e) {
            System.err.println("❌ Error fetching next rank: " + e.getMessage());
            return DEFAULT_RANK;
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
    }

}
