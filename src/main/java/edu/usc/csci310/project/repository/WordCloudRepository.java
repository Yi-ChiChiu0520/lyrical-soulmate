package edu.usc.csci310.project.repository;

import edu.usc.csci310.project.model.WordCloudSong;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Repository
public class WordCloudRepository {

    private final Connection connection;

    @Autowired
    public WordCloudRepository(Connection connection) {
        this.connection = connection;
    }

    public boolean addSongsToWordCloud(List<WordCloudSong> songs) {
        String sql = "INSERT INTO wordcloud " +
                "(username, song_id, title, url, image_url, release_date, artist_name, lyrics) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?) " +
                "ON CONFLICT (username, song_id) DO NOTHING";

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            for (WordCloudSong song : songs) {
                stmt.setString(1, song.getUsername());
                stmt.setString(2, song.getSongId());
                stmt.setString(3, song.getTitle());
                stmt.setString(4, song.getUrl());
                stmt.setString(5, song.getImageUrl());
                stmt.setString(6, song.getReleaseDate());
                stmt.setString(7, song.getArtistName());
                stmt.setString(8, song.getLyrics());
                stmt.addBatch();
            }

            stmt.executeBatch();
            return true;
        }  catch (SQLException e) {
            System.err.println("❌ SQL error in addSongsToWordCloud: " + e.getMessage());
            for (WordCloudSong song : songs) {
                System.out.println("🔍 Failing song: " + song);
            }
            return false;
    }

}


    public List<WordCloudSong> getUserWordCloud(String username) {
        List<WordCloudSong> list = new ArrayList<>();
        String sql = "SELECT * FROM wordcloud WHERE username = ?";

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, username);
            ResultSet rs = stmt.executeQuery();

            while (rs.next()) {
                list.add(new WordCloudSong(
                        rs.getString("username"),
                        rs.getString("song_id"),
                        rs.getString("title"),
                        rs.getString("url"),
                        rs.getString("image_url"),
                        rs.getString("release_date"),
                        rs.getString("artist_name"),
                        rs.getString("lyrics")
                ));
            }
        } catch (SQLException e) {
            System.err.println("❌ Error fetching word cloud: " + e.getMessage());
        }

        return list;
    }

    public boolean removeFromWordCloud(String username, String songId) {
        String sql = "DELETE FROM wordcloud WHERE username = ? AND song_id = ?";

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, username);
            stmt.setString(2, songId);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("❌ Error removing from word cloud: " + e.getMessage());
            return false;
        }
    }

    public boolean clearUserWordCloud(String username) {
        String sql = "DELETE FROM wordcloud WHERE username = ?";

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, username);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("❌ Error clearing word cloud: " + e.getMessage());
            return false;
        }
    }

}
