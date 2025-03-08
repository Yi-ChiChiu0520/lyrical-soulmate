package edu.usc.csci310.project.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.sql.*;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class UserRepositoryTest {

    private UserRepository userRepository;
    private BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Mock
    private Connection mockConnection;

    @Mock
    private PreparedStatement mockPreparedStatement;

    @Mock
    private ResultSet mockResultSet;

    @BeforeEach
    void setUp() throws SQLException {
        MockitoAnnotations.openMocks(this);
        userRepository = new UserRepository(mockConnection);

        when(mockConnection.prepareStatement(anyString())).thenReturn(mockPreparedStatement);
    }

    /** ✅ Test: Successful user registration */
    @Test
    void testRegisterUserSuccess() throws SQLException {
        when(mockPreparedStatement.executeUpdate()).thenReturn(1);

        boolean result = userRepository.registerUser("testUser", "Password123");

        assertTrue(result, "User should be registered successfully.");
        verify(mockPreparedStatement, times(1)).setString(1, "testUser");
        verify(mockPreparedStatement, times(1)).setString(eq(2), anyString()); // Password is hashed
        verify(mockPreparedStatement, times(1)).executeUpdate();
    }

    /** ✅ Test: User registration fails due to SQL constraint */
    @Test
    void testRegisterUserFailsDueToSQLIssue() throws SQLException {
        when(mockPreparedStatement.executeUpdate()).thenThrow(new SQLException("Unique constraint violated"));

        boolean result = userRepository.registerUser("existingUser", "Password123");

        assertFalse(result, "User registration should fail due to SQL constraint.");
    }

    /** ✅ Test: Retrieve existing user's password */
    @Test
    void testGetUserPasswordSuccess() throws SQLException {
        String hashedPassword = passwordEncoder.encode("Password123");
        when(mockPreparedStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(true);
        when(mockResultSet.getString("password")).thenReturn(hashedPassword);

        Optional<String> retrievedPassword = userRepository.getUserPassword("testUser");

        assertTrue(retrievedPassword.isPresent());
        assertEquals(hashedPassword, retrievedPassword.get(), "Retrieved password should match stored hash.");
    }

    /** ✅ Test: Retrieve password for non-existent user */
    @Test
    void testGetUserPasswordUserNotFound() throws SQLException {
        when(mockPreparedStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(false);

        Optional<String> retrievedPassword = userRepository.getUserPassword("nonExistentUser");

        assertFalse(retrievedPassword.isPresent(), "No password should be returned for non-existent user.");
    }

    /** ✅ Test: getUserPassword closes statement successfully */
    @Test
    void testGetUserPassword_ClosesStatementSuccessfully() throws SQLException {
        when(mockPreparedStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(false);

        userRepository.getUserPassword("testUser");

        verify(mockPreparedStatement, times(1)).close(); // Ensures stmt.close() is called
    }

    /** ✅ Test: getUserPassword handles exception when closing statement */
    @Test
    void testGetUserPassword_StatementCloseException() throws SQLException {
        when(mockPreparedStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(false);
        doThrow(new SQLException("Close error")).when(mockPreparedStatement).close();

        userRepository.getUserPassword("testUser");

        verify(mockPreparedStatement, times(1)).close(); // stmt.close() should still be attempted
    }

    /** ✅ Test: getUserPassword handles null statement case */
    @Test
    void testGetUserPassword_NullStatement() throws SQLException {
        when(mockConnection.prepareStatement(anyString())).thenThrow(new SQLException("Failed to create statement"));

        Optional<String> result = userRepository.getUserPassword("nonExistentUser");

        assertFalse(result.isPresent(), "Should return empty Optional");
        verify(mockPreparedStatement, never()).close(); // stmt should not be closed if never created
    }
    @Test
    void testGetUserPassword_ErrorClosingResultSet() throws SQLException {
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockPreparedStatement);
        when(mockPreparedStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(false); // No data found

        // Force an exception when closing the ResultSet
        doThrow(new SQLException("Error closing ResultSet")).when(mockResultSet).close();

        Optional<String> result = userRepository.getUserPassword("testUser");

        assertFalse(result.isPresent(), "Should return empty Optional when no user is found");

        // Verify exception was logged (if you log errors, check the console output)
        verify(mockResultSet, times(1)).close(); // Ensures closing was attempted
    }
    /** ✅ Test: User exists */
    @Test
    void testExistsByUsernameUserExists() throws SQLException {
        when(mockPreparedStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(true);

        boolean exists = userRepository.existsByUsername("testUser");

        assertTrue(exists, "User should exist.");
    }

    /** ✅ Test: User does not exist */
    @Test
    void testExistsByUsernameUserDoesNotExist() throws SQLException {
        when(mockPreparedStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(false);

        boolean exists = userRepository.existsByUsername("nonExistentUser");

        assertFalse(exists, "User should not exist.");
    }

    /** ✅ Test: existsByUsername handles SQL exception */
    @Test
    void testExistsByUsernameSQLExceptionHandled() throws SQLException {
        when(mockPreparedStatement.executeQuery()).thenThrow(new SQLException("Database error"));

        boolean exists = userRepository.existsByUsername("errorUser");

        assertFalse(exists, "Should return false if SQL exception occurs.");
    }
}
