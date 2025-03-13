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
            String createTableSQL = "CREATE TABLE IF NOT EXISTS users (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "username TEXT UNIQUE NOT NULL, " +
                    "password TEXT NOT NULL)";
            stmt.executeUpdate(createTableSQL);

            System.out.println("✅ Users table created or already exists.");
        } catch (SQLException e) {
            System.err.println("❌ Database initialization error: " + e.getMessage());
            throw new RuntimeException("Error initializing the database", e);
        }
    }
}