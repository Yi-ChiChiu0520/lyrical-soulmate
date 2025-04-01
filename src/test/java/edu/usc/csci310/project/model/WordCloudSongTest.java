package edu.usc.csci310.project.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class WordCloudSongTest {

    @Test
    void testAllArgsConstructorAndGetters() {
        WordCloudSong song = new WordCloudSong(
                "user123",
                "song456",
                "Test Song",
                "http://example.com/song",
                "http://example.com/img.jpg",
                "2023-01-01",
                "Test Artist",
                "Lyrics go here"
        );

        assertEquals("user123", song.getUsername());
        assertEquals("song456", song.getSongId());
        assertEquals("Test Song", song.getTitle());
        assertEquals("http://example.com/song", song.getUrl());
        assertEquals("http://example.com/img.jpg", song.getImageUrl());
        assertEquals("2023-01-01", song.getReleaseDate());
        assertEquals("Test Artist", song.getArtistName());
        assertEquals("Lyrics go here", song.getLyrics());
    }

    @Test
    void testSettersAndGetters() {
        WordCloudSong song = new WordCloudSong();

        song.setUsername("alice");
        song.setSongId("abc123");
        song.setTitle("My Song");
        song.setUrl("http://song.url");
        song.setImageUrl("http://image.url");
        song.setReleaseDate("2024-12-31");
        song.setArtistName("Some Artist");
        song.setLyrics("Some lyrics here");

        assertEquals("alice", song.getUsername());
        assertEquals("abc123", song.getSongId());
        assertEquals("My Song", song.getTitle());
        assertEquals("http://song.url", song.getUrl());
        assertEquals("http://image.url", song.getImageUrl());
        assertEquals("2024-12-31", song.getReleaseDate());
        assertEquals("Some Artist", song.getArtistName());
        assertEquals("Some lyrics here", song.getLyrics());
    }
}
