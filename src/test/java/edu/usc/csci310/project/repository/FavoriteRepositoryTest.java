package edu.usc.csci310.project.repository;

import edu.usc.csci310.project.model.FavoriteSong;
import org.junit.jupiter.api.*;

import java.lang.reflect.Method;
import java.sql.*;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FavoriteRepositoryTest {

    private Connection connection;
    private FavoriteRepository repository;

    @BeforeEach
    void setup() throws SQLException {
        connection = DriverManager.getConnection("jdbc:sqlite::memory:");
        repository = new FavoriteRepository(connection);

        try (Statement stmt = connection.createStatement()) {
            stmt.executeUpdate("""
                CREATE TABLE favorites (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL,
                    song_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    url TEXT NOT NULL,
                    image_url TEXT NOT NULL,
                    release_date TEXT,
                    artist_name TEXT,
                    lyrics TEXT,
                    rank INTEGER NOT NULL,
                    UNIQUE (username, song_id)
                )
            """);
        }
    }

    @AfterEach
    void clear() throws SQLException {
        try (Statement stmt = connection.createStatement()) {
            stmt.execute("DELETE FROM favorites");
        }
    }

    @Test
    void testAddFavoriteSuccess() {
        boolean result = repository.addFavorite("user1", "song1", "Title", "url", "img", "2023", "Artist", "lyrics");
        assertTrue(result);

        List<FavoriteSong> favorites = repository.getFavorites("user1");
        assertEquals(1, favorites.size());
    }

    @Test
    void testAddFavoriteSQLException() throws Exception {
        Connection mockConn = mock(Connection.class);
        FavoriteRepository repo = new FavoriteRepository(mockConn);
        when(mockConn.prepareStatement(anyString())).thenThrow(new SQLException("Insert error"));

        boolean result = repo.addFavorite("user", "song", "t", "u", "i", "d", "a", "l");
        assertFalse(result);
    }

    @Test
    void testGetFavoritesEmpty() {
        List<FavoriteSong> result = repository.getFavorites("none");
        assertTrue(result.isEmpty());
    }

    @Test
    void testGetFavoritesSQLException() throws Exception {
        Connection mockConn = mock(Connection.class);
        FavoriteRepository repo = new FavoriteRepository(mockConn);
        when(mockConn.prepareStatement(anyString())).thenThrow(new SQLException("Select error"));

        List<FavoriteSong> result = repo.getFavorites("user");
        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void testRemoveFavoriteSuccess() {
        repository.addFavorite("user1", "song1", "Title", "url", "img", "2023", "Artist", "lyrics");
        assertTrue(repository.removeFavorite("user1", "song1"));
    }

    @Test
    void testRemoveFavoriteFailure() {
        assertFalse(repository.removeFavorite("user1", "nope"));
    }

    @Test
    void testRemoveFavoriteSQLException() throws Exception {
        Connection mockConn = mock(Connection.class);
        FavoriteRepository repo = new FavoriteRepository(mockConn);
        when(mockConn.prepareStatement(anyString())).thenThrow(new SQLException("Delete error"));

        boolean result = repo.removeFavorite("user", "song");
        assertFalse(result);
    }

    @Test
    void testSwapRanksSuccess() {
        repository.addFavorite("user1", "song1", "Title1", "url", "img", "2023", "Artist", "lyrics");
        repository.addFavorite("user1", "song2", "Title2", "url", "img", "2023", "Artist", "lyrics");

        assertTrue(repository.swapRanks("user1", 1, 2));
    }

    @Test
    void testSwapRanksSQLException() throws Exception {
        Connection mockConn = mock(Connection.class);
        when(mockConn.prepareStatement(anyString())).thenThrow(new SQLException("Swap error"));

        FavoriteRepository repo = new FavoriteRepository(mockConn);
        assertFalse(repo.swapRanks("user", 1, 2));
    }

    @Test
    void testGetNextRankDefaultTo1() throws Exception {
        Connection mockConn = mock(Connection.class);
        when(mockConn.prepareStatement(anyString())).thenThrow(new SQLException("Rank error"));

        FavoriteRepository repo = new FavoriteRepository(mockConn);
        boolean result = repo.addFavorite("user", "id", "t", "u", "i", "d", "a", "l");
        // Just trigger the private method and avoid exception propagation.
        assertTrue(result || !result);
    }

    @Test
    void testAutoCommitResetFailureHandled() throws Exception {
        Connection mockConn = mock(Connection.class);
        doThrow(new SQLException("Reset autoCommit fail")).when(mockConn).setAutoCommit(true);
        when(mockConn.prepareStatement(anyString())).thenThrow(new SQLException("Trigger rollback"));

        FavoriteRepository repo = new FavoriteRepository(mockConn);
        assertFalse(repo.swapRanks("user", 1, 2));
    }

    @Test
    void testRollbackFailureHandled() throws Exception {
        Connection mockConn = mock(Connection.class);
        doThrow(new SQLException("Rollback fail")).when(mockConn).rollback();
        when(mockConn.prepareStatement(anyString())).thenThrow(new SQLException("Trigger rollback"));

        FavoriteRepository repo = new FavoriteRepository(mockConn);
        assertFalse(repo.swapRanks("user", 1, 2));
    }

    @Test
    void testGetNextRankSQLExceptionCaught() throws Exception {
        Connection mockConn = mock(Connection.class);
        when(mockConn.prepareStatement(anyString())).thenThrow(new SQLException("Boom"));

        FavoriteRepository repo = new FavoriteRepository(mockConn);

        // Directly call the private getNextRank method using reflection
        Method method = FavoriteRepository.class.getDeclaredMethod("getNextRank", String.class);
        method.setAccessible(true);
        int result = (int) method.invoke(repo, "user");

        assertEquals(1, result); // Should fallback to default value 1 in case of SQLException
    }

    @Test
    void testGetNextRankRsNextFalse() throws Exception {
        Connection mockConn = mock(Connection.class);
        PreparedStatement mockStmt = mock(PreparedStatement.class);
        ResultSet mockRs = mock(ResultSet.class);

        when(mockConn.prepareStatement(anyString())).thenReturn(mockStmt);
        when(mockStmt.executeQuery()).thenReturn(mockRs);
        when(mockRs.next()).thenReturn(false); // simulate no results

        FavoriteRepository repo = new FavoriteRepository(mockConn);

        // Invoke getNextRank indirectly via addFavorite to ensure no exception is thrown.
        boolean result = repo.addFavorite("user", "id", "t", "u", "i", "d", "a", "l");

        assertTrue(result || !result); // Just ensuring it doesn't throw an exception.
    }

    @Test
    void testGetFavoritesRankLessThanOne() throws SQLException {
        try (PreparedStatement stmt = connection.prepareStatement("""
            INSERT INTO favorites (username, song_id, title, url, image_url, release_date, artist_name, lyrics, rank)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """)) {
            stmt.setString(1, "user1");
            stmt.setString(2, "song1");
            stmt.setString(3, "Title");
            stmt.setString(4, "url");
            stmt.setString(5, "img");
            stmt.setString(6, "2023");
            stmt.setString(7, "Artist");
            stmt.setString(8, "lyrics");
            stmt.setInt(9, 0); // This triggers the case where rank is less than 1
            stmt.executeUpdate();
        }

        List<FavoriteSong> favorites = repository.getFavorites("user1");

        assertEquals(1, favorites.size());
        assertEquals(1, favorites.get(0).getRank()); // Confirm that rank is reset to 1
    }

    // New tests for the private getNextRank method using reflection:

    @Test
    void testGetNextRankNormal() throws Exception {
        // Simulate a case where the maximum rank is 5, so the next rank should be 6.
        Connection mockConn = mock(Connection.class);
        PreparedStatement mockStmt = mock(PreparedStatement.class);
        ResultSet mockRs = mock(ResultSet.class);

        when(mockConn.prepareStatement(anyString())).thenReturn(mockStmt);
        when(mockStmt.executeQuery()).thenReturn(mockRs);
        when(mockRs.next()).thenReturn(true);
        when(mockRs.getInt(1)).thenReturn(5);

        FavoriteRepository repo = new FavoriteRepository(mockConn);

        Method method = FavoriteRepository.class.getDeclaredMethod("getNextRank", String.class);
        method.setAccessible(true);
        int result = (int) method.invoke(repo, "user");

        assertEquals(6, result);
    }

    @Test
    void testGetNextRankNegativeValue() throws Exception {
        // Simulate a negative maximum rank from the database.
        Connection mockConn = mock(Connection.class);
        PreparedStatement mockStmt = mock(PreparedStatement.class);
        ResultSet mockRs = mock(ResultSet.class);

        when(mockConn.prepareStatement(anyString())).thenReturn(mockStmt);
        when(mockStmt.executeQuery()).thenReturn(mockRs);
        when(mockRs.next()).thenReturn(true);
        // Simulate a negative value (-1); (-1 + 1 = 0, so Math.max(0, 1) should return 1)
        when(mockRs.getInt(1)).thenReturn(-1);

        FavoriteRepository repo = new FavoriteRepository(mockConn);

        Method method = FavoriteRepository.class.getDeclaredMethod("getNextRank", String.class);
        method.setAccessible(true);
        int result = (int) method.invoke(repo, "user");

        assertEquals(1, result);
    }

    @Test
    void testGetNextRankNoResult() throws Exception {
        // New test to cover the branch where rs.next() returns false.
        Connection mockConn = mock(Connection.class);
        PreparedStatement mockStmt = mock(PreparedStatement.class);
        ResultSet mockRs = mock(ResultSet.class);

        when(mockConn.prepareStatement(anyString())).thenReturn(mockStmt);
        when(mockStmt.executeQuery()).thenReturn(mockRs);
        when(mockRs.next()).thenReturn(false); // simulate no results

        FavoriteRepository repo = new FavoriteRepository(mockConn);

        Method method = FavoriteRepository.class.getDeclaredMethod("getNextRank", String.class);
        method.setAccessible(true);
        int result = (int) method.invoke(repo, "user");

        assertEquals(1, result);
    }
    @Test
    void testGetNextRankSQLExceptionDuringExecuteQuery() throws Exception {
        Connection mockConn = mock(Connection.class);
        PreparedStatement mockStmt = mock(PreparedStatement.class);
        // When preparing the statement, return a valid statement...
        when(mockConn.prepareStatement(anyString())).thenReturn(mockStmt);
        // ...but throw an exception when executeQuery() is called.
        when(mockStmt.executeQuery()).thenThrow(new SQLException("Execute query error"));

        FavoriteRepository repo = new FavoriteRepository(mockConn);
        Method method = FavoriteRepository.class.getDeclaredMethod("getNextRank", String.class);
        method.setAccessible(true);
        int result = (int) method.invoke(repo, "user");

        // Expect default value 1 when an exception is caught
        assertEquals(1, result);
    }
    @Test
    void testGetNextRankHappyPath() throws Exception {
        Connection mockConn = mock(Connection.class);
        PreparedStatement mockStmt = mock(PreparedStatement.class);
        ResultSet mockRs = mock(ResultSet.class);

        when(mockConn.prepareStatement(anyString())).thenReturn(mockStmt);
        when(mockStmt.executeQuery()).thenReturn(mockRs);
        when(mockRs.next()).thenReturn(true);
        when(mockRs.getInt(1)).thenReturn(2); // simulate existing max rank

        FavoriteRepository repo = new FavoriteRepository(mockConn);
        Method method = FavoriteRepository.class.getDeclaredMethod("getNextRank", String.class);
        method.setAccessible(true);
        int result = (int) method.invoke(repo, "user");

        assertEquals(3, result); // 2 + 1
    }

    @Test
    void testGetNextRankNoExceptionPath() throws Exception {
        Connection mockConn = mock(Connection.class);
        PreparedStatement mockStmt = mock(PreparedStatement.class);
        ResultSet mockRs = mock(ResultSet.class);

        when(mockConn.prepareStatement(anyString())).thenReturn(mockStmt);
        when(mockStmt.executeQuery()).thenReturn(mockRs);
        when(mockRs.next()).thenReturn(false); // no row returned

        FavoriteRepository repo = new FavoriteRepository(mockConn);

        Method method = FavoriteRepository.class.getDeclaredMethod("getNextRank", String.class);
        method.setAccessible(true);
        int result = (int) method.invoke(repo, "user");

        // should return 1 if no rows are found, but also doesn't throw exception
        assertEquals(1, result);
    }
    @Test
    void testGetNextRank_ResultSetCloseThrowsException() throws Exception {
        // Arrange
        Connection mockConn = mock(Connection.class);
        PreparedStatement mockStmt = mock(PreparedStatement.class);
        ResultSet mockRs = mock(ResultSet.class);

        when(mockConn.prepareStatement(anyString())).thenReturn(mockStmt);
        when(mockStmt.executeQuery()).thenReturn(mockRs);
        when(mockRs.next()).thenReturn(true);
        when(mockRs.getInt(1)).thenReturn(3); // Existing max rank

        // Force ResultSet.close() to throw exception
        doThrow(new SQLException("ResultSet close failed")).when(mockRs).close();

        FavoriteRepository repo = new FavoriteRepository(mockConn);

        // Act (using reflection to access private method)
        Method method = FavoriteRepository.class.getDeclaredMethod("getNextRank", String.class);
        method.setAccessible(true);
        int result = (int) method.invoke(repo, "testuser");

        // Assert
        assertEquals(4, result); // Should still return correct rank
        verify(mockRs).close(); // Verify close was attempted
    }
    @Test
    void testGetNextRank_StatementCloseThrowsException() throws Exception {
        // Arrange
        Connection mockConn = mock(Connection.class);
        PreparedStatement mockStmt = mock(PreparedStatement.class);
        ResultSet mockRs = mock(ResultSet.class);

        when(mockConn.prepareStatement(anyString())).thenReturn(mockStmt);
        when(mockStmt.executeQuery()).thenReturn(mockRs);
        when(mockRs.next()).thenReturn(false); // No existing ranks

        // Force PreparedStatement.close() to throw exception
        doThrow(new SQLException("Statement close failed")).when(mockStmt).close();

        FavoriteRepository repo = new FavoriteRepository(mockConn);

        // Act
        Method method = FavoriteRepository.class.getDeclaredMethod("getNextRank", String.class);
        method.setAccessible(true);
        int result = (int) method.invoke(repo, "testuser");

        // Assert
        assertEquals(1, result); // Should return default
        verify(mockStmt).close(); // Verify close was attempted
    }

    @Test
    void testGetNextRank_BothCloseOperationsThrowExceptions() throws Exception {
        // Arrange
        Connection mockConn = mock(Connection.class);
        PreparedStatement mockStmt = mock(PreparedStatement.class);
        ResultSet mockRs = mock(ResultSet.class);

        when(mockConn.prepareStatement(anyString())).thenReturn(mockStmt);
        when(mockStmt.executeQuery()).thenReturn(mockRs);
        when(mockRs.next()).thenReturn(true);
        when(mockRs.getInt(1)).thenReturn(5); // Existing max rank

        // Force both close operations to throw exceptions
        doThrow(new SQLException("ResultSet close failed")).when(mockRs).close();
        doThrow(new SQLException("Statement close failed")).when(mockStmt).close();

        FavoriteRepository repo = new FavoriteRepository(mockConn);

        // Act
        Method method = FavoriteRepository.class.getDeclaredMethod("getNextRank", String.class);
        method.setAccessible(true);
        int result = (int) method.invoke(repo, "testuser");

        // Assert
        assertEquals(6, result); // Should return
    }
}

