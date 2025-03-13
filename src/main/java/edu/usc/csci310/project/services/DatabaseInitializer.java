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

            // Create Users Table
            String createUsersTableSQL = "CREATE TABLE IF NOT EXISTS users (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "username TEXT UNIQUE NOT NULL, " +
                    "password TEXT NOT NULL)";
            stmt.executeUpdate(createUsersTableSQL);
            System.out.println("✅ Users table created or already exists.");

            // Create Favorites Table
            String createFavoritesTableSQL = "CREATE TABLE IF NOT EXISTS favorites (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "username TEXT NOT NULL, " +
                    "song_id TEXT NOT NULL, " +
                    "title TEXT NOT NULL, " + // Will store encrypted data
                    "url TEXT NOT NULL, " + // Will store encrypted data
                    "image_url TEXT NOT NULL, " + // Will store encrypted data
                    "release_date TEXT, " + // Will store encrypted data
                    "artist_name TEXT, " + // Will store encrypted data
                    "rank INTEGER NOT NULL, " +
                    "UNIQUE (username, song_id))"; // Prevent duplicate song favorites
            stmt.executeUpdate(createFavoritesTableSQL);
            System.out.println("✅ Favorites table created or already exists.");

        } catch (SQLException e) {
            System.err.println("❌ Database initialization error: " + e.getMessage());
            throw new RuntimeException("Error initializing the database", e);
        }
    }
}