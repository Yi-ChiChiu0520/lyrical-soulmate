package edu.usc.csci310.project.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

import static org.mockito.Mockito.*;

class DatabaseInitializerTest {

    @Mock
    private Connection mockConnection;

    @Mock
    private Statement mockStatement;

    private DatabaseInitializer databaseInitializer;

    @BeforeEach
    void setUp() throws SQLException {
        MockitoAnnotations.openMocks(this);
        when(mockConnection.createStatement()).thenReturn(mockStatement);
        databaseInitializer = new DatabaseInitializer(mockConnection);
    }

    @Test
    void testInitializeDatabaseSuccess() throws SQLException {
        databaseInitializer.initializeDatabase();

        verify(mockConnection, times(1)).createStatement();
        verify(mockStatement, times(1)).executeUpdate(anyString());
        verify(mockStatement, times(1)).close();
    }

    @Test
    void testInitializeDatabaseFailure() throws SQLException {
        when(mockConnection.createStatement()).thenThrow(new SQLException("Test SQL Exception"));

        try {
            databaseInitializer.initializeDatabase();
        } catch (RuntimeException e) {
            assert e.getMessage().contains("Error initializing the database");
        }

        verify(mockConnection, times(1)).createStatement();
        verify(mockStatement, never()).executeUpdate(anyString());
    }
}
