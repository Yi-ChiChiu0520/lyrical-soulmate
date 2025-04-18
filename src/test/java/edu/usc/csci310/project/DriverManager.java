package edu.usc.csci310.project;

import edu.usc.csci310.project.repository.UserRepository;
import edu.usc.csci310.project.services.AuthService;
import io.cucumber.java.Before;
import org.junit.jupiter.api.AfterAll;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;

public class DriverManager {
    protected static WebDriver driver;

    public DriverManager() {}

    public static WebDriver getDriver() {
        if (driver == null) {
            driver = new ChromeDriver();
        }
        return driver;
    }

    public static void resetUserDatabase(Connection connection) {
        try (Statement stmt = connection.createStatement()) {
            // drop and create users table
            stmt.executeUpdate("DROP TABLE IF EXISTS users");
            String createTableSQL = "CREATE TABLE IF NOT EXISTS users (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "username TEXT UNIQUE NOT NULL, " +
                    "raw_username TEXT UNIQUE NOT NULL, " +
                    "password TEXT NOT NULL, " +
                    "failed_login_attempts INTEGER DEFAULT 0, " +
                    "account_locked BOOLEAN DEFAULT FALSE, " +
                    "lock_time TIMESTAMP DEFAULT NULL)";
            stmt.executeUpdate(createTableSQL);

            // Drop and Create Favorites Table
            stmt.executeUpdate("DROP TABLE IF EXISTS favorites");
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


            // Drop and create Word Cloud Table
            stmt.executeUpdate("DROP TABLE IF EXISTS wordcloud");
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
        } catch (SQLException e) {
            throw new RuntimeException("Error clearing the database before scenario", e);
        }
    }


    public static void createUserWithUsername(Connection connection, String username) {
        UserRepository userRepository = new UserRepository(connection);
        AuthService authService = new AuthService(userRepository);
        authService.registerUser(username, "Valid1Pass");
    }

    // deletes user favorites
    public static void resetUserFavorites(Connection connection, String username) {
        String sql = "DELETE FROM favorites WHERE username = ?";

        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, username);
            stmt.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Error resetting user favorites", e);
        }
    }

    // creates a test user and signs in using localstorage
    public static void signInAsTester(Connection connection) {
        // create user in the database
        DriverManager.createUserWithUsername(connection,"testUser");

        // go to the login page
        driver.get("http://localhost:8080");

        // add the user to localstorage so frontend sees that we are logged in
        JavascriptExecutor js = (JavascriptExecutor) driver;
        js.executeScript("window.localStorage.setItem('user', 'testUser');");
    }

    public static void closeDriver() {
        if (driver != null) {
            driver.quit();
            driver = null; // Reset driver to null after quitting
        }
    }

    public static void createTestUser(Connection connection, String username) {
        createUserWithUsername(connection, username);
        // Set default password if needed
    }
}