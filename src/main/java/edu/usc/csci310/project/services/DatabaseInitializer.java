package edu.usc.csci310.project.services;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

@Service
public class DatabaseInitializer {

    private final Connection connection;

    @Autowired
    public DatabaseInitializer(Connection connection) {
        this.connection = connection;
    }

    @PostConstruct
    public void initializeDatabase() {
        try (Statement stmt = connection.createStatement()) {
            System.out.println("✅ Initializing database...");
//            stmt.executeUpdate("DROP TABLE IF EXISTS users");

            // Create Users Table
            String createUsersTableSQL = "CREATE TABLE IF NOT EXISTS users (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "username TEXT UNIQUE NOT NULL, " +
                    "raw_username TEXT UNIQUE NOT NULL, " +
                    "password TEXT NOT NULL, " +
                    "failed_login_attempts INTEGER DEFAULT 0, " +
                    "account_locked INTEGER DEFAULT 0, " +  // ✅ FIXED
                    "lock_time TIMESTAMP DEFAULT NULL, " +
                    "favorites_private INTEGER DEFAULT 0)"; // ✅ FIXED


            stmt.executeUpdate(createUsersTableSQL);
            System.out.println("✅ Users table created or already exists.");

            // Drop and Create Favorites Table
            //stmt.executeUpdate("DROP TABLE IF EXISTS favorites");

            String createFavoritesTableSQL = "CREATE TABLE IF NOT EXISTS favorites (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "username TEXT NOT NULL, " +
                    "song_id TEXT NOT NULL, " +
                    "title TEXT NOT NULL, " +
                    "url TEXT NOT NULL, " +
                    "image_url TEXT NOT NULL, " +
                    "release_date TEXT, " +
                    "artist_name TEXT, " +
                    "lyrics TEXT, " +
                    "rank INTEGER NOT NULL, " +
                    "UNIQUE (username, song_id))";
            stmt.executeUpdate(createFavoritesTableSQL);
            System.out.println("✅ Favorites table created or already exists.");

            //stmt.executeUpdate("DROP TABLE IF EXISTS wordcloud");

            // 🔥 Create Word Cloud Table
            String createWordCloudTableSQL = "CREATE TABLE IF NOT EXISTS wordcloud (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "username TEXT NOT NULL, " +
                    "song_id TEXT NOT NULL, " +
                    "title TEXT NOT NULL, " +
                    "url TEXT NOT NULL, " +
                    "image_url TEXT NOT NULL, " +
                    "release_date TEXT, " +
                    "artist_name TEXT, " +
                    "lyrics TEXT, " +
                    "UNIQUE (username, song_id))";
            stmt.executeUpdate(createWordCloudTableSQL);
            System.out.println("✅ Word Cloud table created or already exists.");

        } catch (SQLException e) {
            System.err.println("❌ Database initialization error: " + e.getMessage());
            throw new RuntimeException("Error initializing the database", e);
        }
    }
}
