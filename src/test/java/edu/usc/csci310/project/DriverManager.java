package edu.usc.csci310.project;

import edu.usc.csci310.project.repository.UserRepository;
import edu.usc.csci310.project.services.AuthService;
import io.cucumber.java.Before;
import org.junit.jupiter.api.AfterAll;
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
            String deleteTableSQL = "DROP TABLE IF EXISTS users";
            stmt.executeUpdate(deleteTableSQL);

            String createTableSQL = "CREATE TABLE IF NOT EXISTS users (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "username TEXT UNIQUE NOT NULL, " +
                    "password TEXT NOT NULL, " +
                    "failed_login_attempts INTEGER DEFAULT 0, " +
                    "account_locked BOOLEAN DEFAULT FALSE, " +
                    "lock_time TIMESTAMP DEFAULT NULL)";

            stmt.executeUpdate(createTableSQL);
        } catch (SQLException e) {
            throw new RuntimeException("Error clearing the database before scenario", e);
        }
    }

    public static void createUserWithUsername(Connection connection, String username) {
        UserRepository userRepository = new UserRepository(connection);
        AuthService authService = new AuthService(userRepository);
        authService.registerUser(username, "Valid1Pass");
    }

    public static void closeDriver() {
        if (driver != null) {
            driver.quit();
            driver = null; // Reset driver to null after quitting
        }
    }
} 