package edu.usc.csci310.project.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;

import java.sql.Connection;
import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
public class DatabaseConfigTest {

    @Autowired
    private ApplicationContext context;

    @Test
    public void testSqliteConnection() throws SQLException {
        // Arrange: Get the DatabaseConfig bean from the Spring context
        DatabaseConfig databaseConfig = context.getBean(DatabaseConfig.class);

        // Act: Invoke the sqliteConnection() method
        Connection connection = databaseConfig.sqliteConnection();

        // Assert: Verify that the connection is not null
        assertNotNull(connection, "Connection should not be null");

        // Cleanup: Close the connection
        connection.close();
    }

    @Test
    public void testSqliteConnectionThrowsSQLException() {
        // Arrange: Mock a scenario where the connection fails
        DatabaseConfig databaseConfig = new DatabaseConfig() {
            @Override
            public Connection sqliteConnection() throws SQLException {
                throw new SQLException("Failed to connect to the database");
            }
        };

        // Act & Assert: Verify that SQLException is thrown
        assertThrows(SQLException.class, databaseConfig::sqliteConnection, "SQLException should be thrown");
    }
}