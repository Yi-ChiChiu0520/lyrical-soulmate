package edu.usc.csci310.project.repository;

import edu.usc.csci310.project.model.WordCloudSong;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class WordCloudRepositoryMockTest {

    private WordCloudRepository repository;
    private Connection mockConnection;

    @BeforeEach
    void setup() throws SQLException {
        mockConnection = mock(Connection.class);
        repository = new WordCloudRepository(mockConnection);
    }
    @Test
    void testAddSongsToWordCloudSQLException() throws Exception {
        PreparedStatement mockStatement = mock(PreparedStatement.class);
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement);
        when(mockStatement.executeBatch()).thenThrow(new SQLException("Batch insert fail"));

        WordCloudRepository failingRepo = new WordCloudRepository(mockConnection);
        WordCloudSong song = new WordCloudSong("user1", "song123", "Title", "url", "img", "2023", "Artist", "lyrics");

        boolean result = failingRepo.addSongsToWordCloud(List.of(song));

        assertFalse(result);
    }

    @Test
    void testGetUserWordCloudSQLException() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenThrow(new SQLException("DB error"));

        var result = repository.getUserWordCloud("user1");

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void testRemoveFromWordCloudSQLException() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenThrow(new SQLException("fail"));

        boolean result = repository.removeFromWordCloud("user1", "song123");

        assertFalse(result);
    }

    @Test
    void testClearUserWordCloudSQLException() throws Exception {
        when(mockConnection.prepareStatement(anyString())).thenThrow(new SQLException("fail"));

        boolean result = repository.clearUserWordCloud("user1");

        assertFalse(result);
    }
}
