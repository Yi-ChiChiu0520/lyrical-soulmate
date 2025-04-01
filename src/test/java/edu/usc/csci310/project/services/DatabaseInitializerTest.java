package edu.usc.csci310.project.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class DatabaseInitializerTest {

    private Connection mockConnection;
    private Statement mockStatement;
    private DatabaseInitializer databaseInitializer;

    @BeforeEach
    void setUp() throws SQLException {
        mockConnection = mock(Connection.class);
        mockStatement = mock(Statement.class);

        when(mockConnection.createStatement()).thenReturn(mockStatement);

        databaseInitializer = new DatabaseInitializer(mockConnection);
    }

    @Test
    void testInitializeDatabaseExecutesStatements() throws SQLException {
        databaseInitializer.initializeDatabase();

        // Verify statements were executed
        verify(mockStatement, atLeastOnce()).executeUpdate(anyString());
        verify(mockStatement).close();
    }

    @Test
    void testInitializeDatabaseThrowsOnSqlError() throws SQLException {
        when(mockConnection.createStatement()).thenThrow(new SQLException("DB error"));

        DatabaseInitializer failingInitializer = new DatabaseInitializer(mockConnection);

        assertThrows(RuntimeException.class, failingInitializer::initializeDatabase);
    }
}
