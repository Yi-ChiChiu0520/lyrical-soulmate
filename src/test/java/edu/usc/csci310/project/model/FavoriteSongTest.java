package edu.usc.csci310.project.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class FavoriteSongTest {

    private FavoriteSong song;

    @BeforeEach
    void setUp() {
        song = new FavoriteSong(
                "testUser",
                "123",
                "Test Title",
                "https://example.com/song",
                "https://example.com/image.jpg",
                "2023-01-01",
                "Test Artist",
                "These are the test lyrics.",
                1
        );
    }

    @Test
    void testConstructorAndGetters() {
        assertEquals("testUser", song.getUsername());
        assertEquals("123", song.getSongId());
        assertEquals("Test Title", song.getTitle());
        assertEquals("https://example.com/song", song.getUrl());
        assertEquals("https://example.com/image.jpg", song.getImageUrl());
        assertEquals("2023-01-01", song.getReleaseDate());
        assertEquals("Test Artist", song.getArtistName());
        assertEquals("These are the test lyrics.", song.getLyrics());
        assertEquals(1, song.getRank());
    }

    @Test
    void testSetters() {
        song.setUsername("newUser");
        song.setSongId("456");
        song.setTitle("New Title");
        song.setUrl("https://new-url.com");
        song.setImageUrl("https://new-img.com");
        song.setReleaseDate("2024-01-01");
        song.setArtistName("New Artist");
        song.setLyrics("New lyrics");
        song.setRank(5);

        assertEquals("newUser", song.getUsername());
        assertEquals("456", song.getSongId());
        assertEquals("New Title", song.getTitle());
        assertEquals("https://new-url.com", song.getUrl());
        assertEquals("https://new-img.com", song.getImageUrl());
        assertEquals("2024-01-01", song.getReleaseDate());
        assertEquals("New Artist", song.getArtistName());
        assertEquals("New lyrics", song.getLyrics());
        assertEquals(5, song.getRank());
    }

    @Test
    void testDefaultConstructorAndId() {
        FavoriteSong emptySong = new FavoriteSong();
        emptySong.setId(99L);
        assertEquals(99L, emptySong.getId());
    }
}
