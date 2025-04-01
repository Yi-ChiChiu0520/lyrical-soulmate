package edu.usc.csci310.project.repository;

import edu.usc.csci310.project.model.WordCloudSong;
import org.junit.jupiter.api.*;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class WordCloudRepositoryTest {

    private static Connection connection;
    private static WordCloudRepository repository;

    @BeforeAll
    static void setupDatabase() throws Exception {
        connection = DriverManager.getConnection("jdbc:sqlite::memory:");
        repository = new WordCloudRepository(connection);

        try (Statement stmt = connection.createStatement()) {
            stmt.executeUpdate("""
                CREATE TABLE IF NOT EXISTS wordcloud (
                    username TEXT NOT NULL,
                    song_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    url TEXT NOT NULL,
                    image_url TEXT NOT NULL,
                    release_date TEXT,
                    artist_name TEXT,
                    lyrics TEXT,
                    UNIQUE (username, song_id)
                )
            """);
        }
    }

    @AfterEach
    void clearTable() throws Exception {
        try (Statement stmt = connection.createStatement()) {
            stmt.execute("DELETE FROM wordcloud");
        }
    }

    @AfterAll
    static void tearDown() throws Exception {
        connection.close();
    }

    @Test
    void testAddSongsToWordCloud_Success() {
        WordCloudSong song = new WordCloudSong("user1", "song123", "Title", "url", "img", "2023", "Artist", "lyrics");
        assertTrue(repository.addSongsToWordCloud(List.of(song)));

        List<WordCloudSong> result = repository.getUserWordCloud("user1");
        assertEquals(1, result.size());
        assertEquals("Title", result.get(0).getTitle());
    }

    @Test
    void testAddDuplicateSong_Ignored() {
        WordCloudSong song = new WordCloudSong("user1", "song123", "Title", "url", "img", "2023", "Artist", "lyrics");
        assertTrue(repository.addSongsToWordCloud(List.of(song)));
        assertTrue(repository.addSongsToWordCloud(List.of(song)));

        List<WordCloudSong> result = repository.getUserWordCloud("user1");
        assertEquals(1, result.size());
    }

    @Test
    void testGetUserWordCloud_Empty() {
        List<WordCloudSong> result = repository.getUserWordCloud("nonexistent");
        assertTrue(result.isEmpty());
    }

    @Test
    void testRemoveFromWordCloud_Success() {
        WordCloudSong song = new WordCloudSong("user1", "song123", "Title", "url", "img", "2023", "Artist", "lyrics");
        repository.addSongsToWordCloud(List.of(song));

        assertTrue(repository.removeFromWordCloud("user1", "song123"));
        assertTrue(repository.getUserWordCloud("user1").isEmpty());
    }

    @Test
    void testRemoveFromWordCloud_Failure() {
        assertFalse(repository.removeFromWordCloud("user1", "nonexistent"));
    }

    @Test
    void testClearUserWordCloud_Success() {
        WordCloudSong song1 = new WordCloudSong("user1", "song1", "Title1", "url", "img", "2023", "Artist", "lyrics");
        WordCloudSong song2 = new WordCloudSong("user1", "song2", "Title2", "url", "img", "2023", "Artist", "lyrics");
        repository.addSongsToWordCloud(List.of(song1, song2));

        assertTrue(repository.clearUserWordCloud("user1"));
        assertTrue(repository.getUserWordCloud("user1").isEmpty());
    }

    @Test
    void testClearUserWordCloud_Failure() {
        assertFalse(repository.clearUserWordCloud("emptyUser"));
    }
}
