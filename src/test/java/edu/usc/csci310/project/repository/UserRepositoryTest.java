package edu.usc.csci310.project.repository;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;

import static edu.usc.csci310.project.util.HashUtil.hashUsername;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserRepositoryTest {


    private final ByteArrayOutputStream errContent = new ByteArrayOutputStream();
    private final PrintStream originalErr = System.err;

    @Mock
    private Connection mockConnection;

    @Mock
    private PreparedStatement mockPreparedStatement;

    @Mock
    private ResultSet mockResultSet;

    @InjectMocks
    private UserRepository userRepository;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();


    @BeforeEach
    void setUp() throws SQLException {
        System.setErr(new PrintStream(errContent)); // ✅ Capture System.err
        lenient().when(mockConnection.prepareStatement(anyString())).thenReturn(mockPreparedStatement);
        lenient().when(mockPreparedStatement.executeQuery()).thenReturn(mockResultSet);
    }

    @AfterEach
    void tearDown() {
        System.setErr(originalErr); // ✅ Restore original System.err
    }



    /**
     * ✅ Test checking if a user exists (returns true)
     */
    @Test
    void testExistsByUsername_Exists() throws SQLException {
        String username = "existingUser";
        when(mockResultSet.next()).thenReturn(true);

        boolean exists = userRepository.existsByUsername(username);

        assertTrue(exists);
        verify(mockPreparedStatement).setString(1, hashUsername(username));
        verify(mockPreparedStatement).executeQuery();
    }

    /**
     * ✅ Test checking if a user does not exist (returns false)
     */
    @Test
    void testExistsByUsername_NotExists() throws SQLException {
        String username = "unknownUser";
        when(mockResultSet.next()).thenReturn(false);

        boolean exists = userRepository.existsByUsername(username);

        assertFalse(exists);
        verify(mockPreparedStatement).setString(1, hashUsername(username));
        verify(mockPreparedStatement).executeQuery();
    }

    /**
     * ✅ Test handling SQLException in existsByUsername
     */
    @Test
    void testExistsByUsername_SQLException() throws SQLException {
        String username = "errorUser";
        when(mockPreparedStatement.executeQuery()).thenThrow(new SQLException("Database error"));

        boolean exists = userRepository.existsByUsername(username);

        assertFalse(exists);
        verify(mockPreparedStatement).setString(1, hashUsername(username));
        verify(mockPreparedStatement).executeQuery();
    }

    /**
     * ✅ Test successful user registration
     */
    @Test
    void testRegisterUser_Success() throws SQLException {
        String username = "newUser";
        String password = "securePass";

        when(mockPreparedStatement.executeUpdate()).thenReturn(1);

        boolean result = userRepository.registerUser(username, password);

        assertTrue(result);
        verify(mockPreparedStatement).setString(eq(1), eq(hashUsername(username))); // ✅ Use `eq()` for consistency
        verify(mockPreparedStatement).setString(eq(2), anyString()); // ✅ Use `eq()` consistently
        verify(mockPreparedStatement).executeUpdate();
        verify(mockPreparedStatement).close();
    }

    /**
     * ✅ Test handling SQLException in registerUser (duplicate username case)
     */
    @Test
    void testRegisterUser_Failure_SQLException() throws SQLException {
        String username = "existingUser";
        String password = "securePass";

        when(mockPreparedStatement.executeUpdate()).thenThrow(new SQLException("Duplicate entry"));

        boolean result = userRepository.registerUser(username, password);

        assertFalse(result);
        verify(mockPreparedStatement).setString(eq(1), eq(hashUsername(username))); // ✅ Use `eq()`
        verify(mockPreparedStatement).setString(eq(2), anyString()); // ✅ Use `eq()` consistently
        verify(mockPreparedStatement).executeUpdate();
        verify(mockPreparedStatement).close();
    }
    @Test
    void testGetUserPassword_UserNotFound() throws SQLException {
        String username = "nonexistentUser";

        // ✅ Ensure that `rs.next()` returns false, simulating a user not found
        when(mockResultSet.next()).thenReturn(false); // ✅ This now covers the false branch of `if (rs.next())`

        Optional<String> retrievedPassword = userRepository.getUserPassword(username);

        // ✅ Assert that an empty Optional is returned
        assertFalse(retrievedPassword.isPresent(), "Expected Optional.empty() but got a value");

        // ✅ Verify that `rs.next()` was actually called and returned false
        verify(mockResultSet, times(1)).next();

        // ✅ Ensure `rs.close()` and `stmt.close()` are properly executed
        verify(mockResultSet, times(1)).close();
        verify(mockPreparedStatement, times(1)).close();
    }

    @Test
    void testGetUserPassword_Success() throws SQLException {
        String username = "testUser";
        String expectedPassword = "hashedPassword123";

        // ✅ Ensure that `rs.next()` is executed
        when(mockResultSet.next()).thenReturn(true); // Ensures we enter `if (rs.next())`
        when(mockResultSet.getString("password")).thenReturn(expectedPassword);

        Optional<String> retrievedPassword = userRepository.getUserPassword(username);

        assertTrue(retrievedPassword.isPresent(), "Expected password to be present but got empty");
        assertEquals(expectedPassword, retrievedPassword.get(), "Expected correct password");

        // ✅ Verify that `rs.next()` was actually called
        verify(mockResultSet, times(1)).next();

        // ✅ Ensure `rs.close()` and `stmt.close()` are properly executed
        verify(mockResultSet, times(1)).close();
        verify(mockPreparedStatement, times(1)).close();
    }

    /**
     * ✅ Test handling SQLException during query execution
     */
    @Test
    void testGetUserPassword_SQLException() throws SQLException {
        String username = "errorUser";
        String hashedUsername = hashUsername(username);

        when(mockPreparedStatement.executeQuery()).thenThrow(new SQLException("Database error"));

        Optional<String> retrievedPassword = userRepository.getUserPassword(username);

        assertFalse(retrievedPassword.isPresent());

        verify(mockPreparedStatement, times(1)).setString(eq(1), eq(hashedUsername));
        verify(mockPreparedStatement, times(1)).executeQuery();
        verify(mockPreparedStatement, times(1)).close();

        // ✅ Verify error log
        assertTrue(errContent.toString().contains("Database error occurred"),
                "Expected 'Database error occurred' in System.err but got: " + errContent);
    }

    /**
     * ✅ Test handling SQLException when closing ResultSet
     */
    @Test
    void testGetUserPassword_ResultSetCloseException() throws SQLException {
        String username = "testUser";
        String hashedUsername = hashUsername(username);

        when(mockResultSet.next()).thenReturn(true);
        when(mockResultSet.getString("password")).thenReturn("hashedPassword123");
        doThrow(new SQLException("Error closing ResultSet")).when(mockResultSet).close();

        Optional<String> retrievedPassword = userRepository.getUserPassword(username);

        assertTrue(retrievedPassword.isPresent());

        verify(mockPreparedStatement, times(1)).setString(eq(1), eq(hashedUsername));
        verify(mockPreparedStatement, times(1)).executeQuery();
        verify(mockResultSet, times(1)).next();
        verify(mockResultSet, times(1)).close();
        verify(mockPreparedStatement, times(1)).close();

        // ✅ Verify error log
        assertTrue(errContent.toString().contains("Error closing ResultSet"),
                "Expected 'Error closing ResultSet' in System.err but got: " + errContent);
    }

    /**
     * ✅ Test handling SQLException when closing PreparedStatement
     */
    @Test
    void testGetUserPassword_PreparedStatementCloseException() throws SQLException {
        String username = "testUser";
        String hashedUsername = hashUsername(username);

        when(mockResultSet.next()).thenReturn(true);
        when(mockResultSet.getString("password")).thenReturn("hashedPassword123");
        doThrow(new SQLException("Error closing PreparedStatement")).when(mockPreparedStatement).close();

        Optional<String> retrievedPassword = userRepository.getUserPassword(username);

        assertTrue(retrievedPassword.isPresent());

        verify(mockPreparedStatement, times(1)).setString(eq(1), eq(hashedUsername));
        verify(mockPreparedStatement, times(1)).executeQuery();
        verify(mockResultSet, times(1)).next();
        verify(mockResultSet, times(1)).close();
        verify(mockPreparedStatement, times(1)).close();

        // ✅ Verify error log
        assertTrue(errContent.toString().contains("Error closing PreparedStatement"),
                "Expected 'Error closing PreparedStatement' in System.err but got: " + errContent);
    }
    /**
     * ✅ Test handling when `stmt` is null (ensures `if (stmt != null)` is covered)
     */
    @Test
    void testGetUserPassword_StatementNull() throws SQLException {
        String username = "testUser";

        when(mockConnection.prepareStatement(anyString())).thenThrow(new SQLException("Statement creation failed"));

        Optional<String> retrievedPassword = userRepository.getUserPassword(username);

        assertFalse(retrievedPassword.isPresent()); // Should return empty due to failure

        verify(mockConnection).prepareStatement(anyString()); // Ensure the statement creation was attempted

        // ✅ Verify `System.err` logs correct error message
        System.err.flush();
        assertTrue(errContent.toString().contains("Database error occurred"),
                "Expected 'Database error occurred' in System.err but got: " + errContent);
    }
}
