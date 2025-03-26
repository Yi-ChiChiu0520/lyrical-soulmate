package edu.usc.csci310.project;

import io.cucumber.java.Before;
import org.junit.jupiter.api.AfterAll;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

public class BaseStepDefs {
    protected static WebDriver driver = new ChromeDriver();
    protected final Connection connection;

    public BaseStepDefs(Connection connection) {
        this.connection = connection;
    }

    @Before
    public void resetUserDatabase() {
        try (Statement stmt = connection.createStatement()) {
            String deleteTableSQL = "DROP TABLE IF EXISTS users";
            stmt.executeUpdate(deleteTableSQL);

            String createTableSQL = "CREATE TABLE IF NOT EXISTS users (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "username TEXT UNIQUE NOT NULL, " +
                    "password TEXT NOT NULL)";
            stmt.executeUpdate(createTableSQL);
        } catch (SQLException e) {
            throw new RuntimeException("Error clearing the database before scenario", e);
        }
    }

    @AfterAll
    public static void closeDriver() {
        driver.quit();
    }
} 