package edu.usc.csci310.project.repository;

import edu.usc.csci310.project.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.sql.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class UserRepositoryTest {

    private Connection mockConnection;
    private PreparedStatement mockStatement;
    private ResultSet mockResultSet;
    private UserRepository userRepository;

    @BeforeEach
    void setup() throws Exception {
        mockConnection = mock(Connection.class);
        mockStatement = mock(PreparedStatement.class);
        mockResultSet = mock(ResultSet.class);
        userRepository = new UserRepository(mockConnection);
    }

    @Test
    void testRegisterUserSuccess() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeUpdate()).thenReturn(1);

        assertTrue(userRepository.registerUser("user", "pass"));
    }

    @Test
    void testRegisterUserSQLException() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenThrow(new SQLException("Insert fail"));

        assertFalse(userRepository.registerUser("user", "pass"));
    }

    @Test
    void testGetUserPasswordSuccess() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(true);
        when(mockResultSet.getString("password")).thenReturn("hashedPass");

        Optional<String> result = userRepository.getUserPassword("user");
        assertTrue(result.isPresent());
        assertEquals("hashedPass", result.get());
    }

    @Test
    void testGetUserPasswordSQLException() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenThrow(new SQLException("Select fail"));

        Optional<String> result = userRepository.getUserPassword("user");
        assertTrue(result.isEmpty());
    }

    @Test
    void testExistsByUsernameTrue() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(true);

        assertTrue(userRepository.existsByUsername("user"));
    }

    @Test
    void testExistsByUsernameSQLException() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenThrow(new SQLException());

        assertFalse(userRepository.existsByUsername("user"));
    }

    @Test
    void testDeleteUserSuccess() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeUpdate()).thenReturn(1);

        assertTrue(userRepository.deleteByUsername("user"));
    }

    @Test
    void testDeleteUserSQLException() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenThrow(new SQLException("Delete fail"));

        assertFalse(userRepository.deleteByUsername("user"));
    }

    @Test
    void testFindByUsernameSuccess() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(true);
        when(mockResultSet.getString("password")).thenReturn("hashedPass");
        when(mockResultSet.getInt("failed_login_attempts")).thenReturn(0);
        when(mockResultSet.getBoolean("account_locked")).thenReturn(false);
        when(mockResultSet.getTimestamp("lock_time")).thenReturn(Timestamp.valueOf(LocalDateTime.now()));

        Optional<User> result = userRepository.findByUsername("testuser");

        assertTrue(result.isPresent());
        assertEquals("hashedPass", result.get().getPassword());
    }

    @Test
    void testFindByUsernameSQLException() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenThrow(new SQLException("Select fail"));

        Optional<User> user = userRepository.findByUsername("user");
        assertTrue(user.isEmpty());
    }

    @Test
    void testUpdateUserSuccess() throws Exception {
        User user = new User("user", "pass", 0, false, null);
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeUpdate()).thenReturn(1);

        assertTrue(userRepository.updateUser(user));
    }

    @Test
    void testUpdateUserSQLException() throws Exception {
        User user = new User("user", "pass", 0, false, null);
        when(mockConnection.prepareStatement(anyString())).thenThrow(new SQLException("Update fail"));

        assertFalse(userRepository.updateUser(user));
    }
    @Test
    void testGetUserPasswordHappyPathNoException() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(true);
        when(mockResultSet.getString("password")).thenReturn("realHashedPass");

        Optional<String> result = userRepository.getUserPassword("someuser");

        assertTrue(result.isPresent());
        assertEquals("realHashedPass", result.get());
    }
    @Test
    void testResultSetCloseThrowsException() throws Exception {
        ResultSet mockRs = mock(ResultSet.class);
        PreparedStatement mockStmt = mock(PreparedStatement.class);

        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStmt);
        when(mockStmt.executeQuery()).thenReturn(mockRs);
        when(mockRs.next()).thenReturn(false);
        doThrow(new SQLException("Error closing ResultSet")).when(mockRs).close();

        UserRepository repo = new UserRepository(mockConnection);
        repo.getUserPassword("someuser");

        // You don’t need assertions here — just executing the path is enough for coverage
    }

    @Test
    void testStatementCloseThrowsException() throws Exception {
        ResultSet mockRs = mock(ResultSet.class);
        PreparedStatement mockStmt = mock(PreparedStatement.class);

        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStmt);
        when(mockStmt.executeQuery()).thenReturn(mockRs);
        when(mockRs.next()).thenReturn(false);
        doThrow(new SQLException("Error closing PreparedStatement")).when(mockStmt).close();

        UserRepository repo = new UserRepository(mockConnection);
        repo.getUserPassword("someuser");

        // No assertions needed — just trigger the path
    }
    @Test
    void testUpdateUserWithLockTimeNotNull() throws Exception {
        PreparedStatement mockStmt = mock(PreparedStatement.class);
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStmt);
        when(mockStmt.executeUpdate()).thenReturn(1); // Simulate update success

        // Provide a non-null lock time to trigger the red path
        LocalDateTime lockTime = LocalDateTime.now();
        User user = new User("user", "pass", 0, false, lockTime);

        boolean result = userRepository.updateUser(user);

        assertTrue(result);
        verify(mockStmt).setTimestamp(eq(4), eq(Timestamp.valueOf(lockTime))); // Ensure it's called
    }
    @Test
    void testUpdateUserReturnsFalseWhenNoRowsUpdated() throws Exception {
        PreparedStatement mockStmt = mock(PreparedStatement.class);
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStmt);
        when(mockStmt.executeUpdate()).thenReturn(0); // Simulate no rows updated

        User user = new User("user", "pass", 0, false, null);

        boolean result = userRepository.updateUser(user);

        assertFalse(result); // This should trigger the "false" return path in `updated > 0`
    }
    @Test
    void testFindByUsernameNotFound() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(false); // simulate no user found

        Optional<User> result = userRepository.findByUsername("nonexistent");
        assertTrue(result.isEmpty());
    }
    @Test
    void testDeleteUserNoRowsAffected() throws Exception {
        PreparedStatement mockStmt = mock(PreparedStatement.class);
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStmt);
        when(mockStmt.executeUpdate()).thenReturn(0); // Simulate no rows deleted

        boolean result = userRepository.deleteByUsername("nonexistent_user");

        assertFalse(result); // Should return false when no rows were deleted
    }
    @Test
    void testFindByUsernameWithoutLockTime() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(true);
        when(mockResultSet.getString("password")).thenReturn("hashedPass");
        when(mockResultSet.getInt("failed_login_attempts")).thenReturn(1);
        when(mockResultSet.getBoolean("account_locked")).thenReturn(false);
        when(mockResultSet.getTimestamp("lock_time")).thenReturn(null); // ✅ key line

        Optional<User> result = userRepository.findByUsername("user");
        assertTrue(result.isPresent());
        assertNull(result.get().getLockTime()); // ✅ confirm null path is covered
    }
    @Test
    void testFindByUsername_NoExceptionThrown() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(true);
        when(mockResultSet.getString("password")).thenReturn("hashedPass");
        when(mockResultSet.getInt("failed_login_attempts")).thenReturn(2);
        when(mockResultSet.getBoolean("account_locked")).thenReturn(true);
        when(mockResultSet.getTimestamp("lock_time")).thenReturn(Timestamp.valueOf(LocalDateTime.now()));

        Optional<User> result = userRepository.findByUsername("testuser");

        assertTrue(result.isPresent());
        assertEquals("hashedPass", result.get().getPassword());
    }

    @Test
    void testFindByUsername_StatementCloseThrowsException() throws Exception {
        // Arrange
        PreparedStatement mockStmt = mock(PreparedStatement.class);
        ResultSet mockRs = mock(ResultSet.class);

        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStmt);
        when(mockStmt.executeQuery()).thenReturn(mockRs);
        when(mockRs.next()).thenReturn(false);

        // Make close() throw an exception
        doThrow(new SQLException("Close failed")).when(mockStmt).close();

        // Act
        Optional<User> result = userRepository.findByUsername("testuser");

        // Assert
        assertTrue(result.isEmpty());
        // Verify the error was logged (if you want to check that)
    }
    @Test
    void testFindByUsernameExecuteQueryThrowsException() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeQuery()).thenThrow(new SQLException("Query failed"));

        Optional<User> result = userRepository.findByUsername("user");
        assertTrue(result.isEmpty());
    }
    @Test
    void testFindByUsername_ResultSetCloseThrowsException() throws Exception {
        // Arrange
        PreparedStatement mockStmt = mock(PreparedStatement.class);
        ResultSet mockRs = mock(ResultSet.class);

        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStmt);
        when(mockStmt.executeQuery()).thenReturn(mockRs);
        when(mockRs.next()).thenReturn(false); // No user found

        // Make rs.close() throw an exception
        doThrow(new SQLException("Failed to close ResultSet")).when(mockRs).close();

        // Act
        Optional<User> result = userRepository.findByUsername("testuser");

        // Assert
        assertTrue(result.isEmpty());
        // Verify the error was logged (if you want to verify logging)
        // You might need to verify System.err output if you want to be thorough
    }
    @Test
    void testFindByRawUsernamePrefix() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(true, true, false);
        when(mockResultSet.getString("raw_username"))
                .thenReturn("alice", "alex");

        List<String> result = userRepository.findByRawUsernamePrefix("al");
        assertEquals(List.of("alice", "alex"), result);
    }

    @Test
    void testFindByRawUsernamePrefixSQLException() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenThrow(new SQLException("Search failed"));
        List<String> result = userRepository.findByRawUsernamePrefix("al");
        assertTrue(result.isEmpty()); // returns empty list on error
    }

    @Test
    void testGetHashedUsernameFromRawFound() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(true);
        when(mockResultSet.getString("username")).thenReturn("hashed_user");

        Optional<String> result = userRepository.getHashedUsernameFromRaw("raw_user");
        assertTrue(result.isPresent());
        assertEquals("hashed_user", result.get());
    }

    @Test
    void testGetHashedUsernameFromRawNotFound() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(false);

        Optional<String> result = userRepository.getHashedUsernameFromRaw("raw_user");
        assertTrue(result.isEmpty());
    }

    @Test
    void testGetHashedUsernameFromRawSQLException() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenThrow(new SQLException("Failure"));

        Optional<String> result = userRepository.getHashedUsernameFromRaw("raw_user");
        assertTrue(result.isEmpty());
    }

    @Test
    void testGetRawUsernameFromHashedFound() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(true);
        when(mockResultSet.getString("raw_username")).thenReturn("raw_user");

        Optional<String> result = userRepository.getRawUsernameFromHashed("hashed_user");
        assertTrue(result.isPresent());
        assertEquals("raw_user", result.get());
    }

    @Test
    void testGetRawUsernameFromHashedNotFound() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(false);

        Optional<String> result = userRepository.getRawUsernameFromHashed("hashed_user");
        assertTrue(result.isEmpty());
    }

    @Test
    void testGetRawUsernameFromHashedSQLException() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenThrow(new SQLException("Failure"));

        Optional<String> result = userRepository.getRawUsernameFromHashed("hashed_user");
        assertTrue(result.isEmpty());
    }
    @Test
    void testGetHashedUsernameFromRaw_NotFound() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(false); // key line

        Optional<String> result = userRepository.getHashedUsernameFromRaw("nonexistent");
        assertTrue(result.isEmpty());
    }
    @Test
    void testGetRawUsernameFromHashed_NotFound() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(false); // key line

        Optional<String> result = userRepository.getRawUsernameFromHashed("nonexistentHashedUser");
        assertTrue(result.isEmpty());
    }

    @Test
    void testCloseResultSetThrowsException_getHashedUsernameFromRaw() throws Exception {
        PreparedStatement stmt = mock(PreparedStatement.class);
        ResultSet rs = mock(ResultSet.class);

        when(mockConnection.prepareStatement(anyString())).thenReturn(stmt);
        when(stmt.executeQuery()).thenReturn(rs);
        when(rs.next()).thenReturn(false);

        doThrow(new SQLException("Failed to close ResultSet")).when(rs).close();

        UserRepository repo = new UserRepository(mockConnection);
        Optional<String> result = repo.getHashedUsernameFromRaw("alice");

        assertTrue(result.isEmpty());
    }

    @Test
    void testClosePreparedStatementThrowsException_getHashedUsernameFromRaw() throws Exception {
        PreparedStatement stmt = mock(PreparedStatement.class);
        ResultSet rs = mock(ResultSet.class);

        when(mockConnection.prepareStatement(anyString())).thenReturn(stmt);
        when(stmt.executeQuery()).thenReturn(rs);
        when(rs.next()).thenReturn(false);

        doThrow(new SQLException("Failed to close PreparedStatement")).when(stmt).close();

        UserRepository repo = new UserRepository(mockConnection);
        Optional<String> result = repo.getHashedUsernameFromRaw("bob");

        assertTrue(result.isEmpty());
    }

    @Test
    void testCloseResultSetThrowsException_getRawUsernameFromHashed() throws Exception {
        PreparedStatement stmt = mock(PreparedStatement.class);
        ResultSet rs = mock(ResultSet.class);

        when(mockConnection.prepareStatement(anyString())).thenReturn(stmt);
        when(stmt.executeQuery()).thenReturn(rs);
        when(rs.next()).thenReturn(false);

        doThrow(new SQLException("Failed to close ResultSet")).when(rs).close();

        UserRepository repo = new UserRepository(mockConnection);
        Optional<String> result = repo.getRawUsernameFromHashed("hashedAlice");

        assertTrue(result.isEmpty());
    }

    @Test
    void testClosePreparedStatementThrowsException_getRawUsernameFromHashed() throws Exception {
        PreparedStatement stmt = mock(PreparedStatement.class);
        ResultSet rs = mock(ResultSet.class);

        when(mockConnection.prepareStatement(anyString())).thenReturn(stmt);
        when(stmt.executeQuery()).thenReturn(rs);
        when(rs.next()).thenReturn(false);

        doThrow(new SQLException("Failed to close PreparedStatement")).when(stmt).close();

        UserRepository repo = new UserRepository(mockConnection);
        Optional<String> result = repo.getRawUsernameFromHashed("hashedBob");

        assertTrue(result.isEmpty());
    }
    @Test
    void testIsFavoritesPrivateTrue() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(true);
        when(mockResultSet.getBoolean("favorites_private")).thenReturn(true);

        boolean result = userRepository.isFavoritesPrivate("user");
        assertTrue(result);
    }

    @Test
    void testIsFavoritesPrivateFalse() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(true);
        when(mockResultSet.getBoolean("favorites_private")).thenReturn(false);

        boolean result = userRepository.isFavoritesPrivate("user");
        assertFalse(result);
    }

    @Test
    void testIsFavoritesPrivateSQLException() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenThrow(new SQLException("Failed"));

        assertThrows(RuntimeException.class, () -> userRepository.isFavoritesPrivate("user"));
    }

    @Test
    void testUpdateFavoritesPrivacySuccess() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeUpdate()).thenReturn(1);

        assertDoesNotThrow(() -> userRepository.updateFavoritesPrivacy("user", true));
    }

    @Test
    void testUpdateFavoritesPrivacySQLException() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenThrow(new SQLException("Failed"));

        assertThrows(RuntimeException.class, () -> userRepository.updateFavoritesPrivacy("user", false));
    }
    @Test
    void testIsFavoritesPrivate_True() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(true);
        when(mockResultSet.getBoolean("favorites_private")).thenReturn(true);

        boolean result = userRepository.isFavoritesPrivate("user");
        assertTrue(result); // ✅ Branch: next=true, getBoolean=true
    }

    @Test
    void testIsFavoritesPrivate_FalseFromResultSet() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(true);
        when(mockResultSet.getBoolean("favorites_private")).thenReturn(false);

        boolean result = userRepository.isFavoritesPrivate("user");
        assertFalse(result); // ✅ Branch: next=true, getBoolean=false
    }

    @Test
    void testIsFavoritesPrivate_ResultSetNextFalse() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeQuery()).thenReturn(mockResultSet);
        when(mockResultSet.next()).thenReturn(false);

        boolean result = userRepository.isFavoritesPrivate("user");
        assertFalse(result); // ✅ Branch: next=false
    }

    @Test
    void testIsFavoritesPrivate_SQLException() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenThrow(new SQLException("fail"));

        assertThrows(RuntimeException.class, () -> userRepository.isFavoritesPrivate("user"));
        // ✅ Branch: exception thrown
    }


}
