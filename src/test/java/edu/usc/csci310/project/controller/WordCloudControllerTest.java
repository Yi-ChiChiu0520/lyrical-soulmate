package edu.usc.csci310.project.controller;

import edu.usc.csci310.project.model.WordCloudSong;
import edu.usc.csci310.project.services.WordCloudService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class WordCloudControllerTest {

    @Mock
    private WordCloudService wordCloudService;

    @InjectMocks
    private WordCloudController wordCloudController;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    public void testAddWordCloudSongsSuccess() {
        List<WordCloudSong> songs = Arrays.asList(new WordCloudSong(), new WordCloudSong());
        when(wordCloudService.addSongsToWordCloud(songs)).thenReturn(true);

        ResponseEntity<String> response = wordCloudController.addWordCloudSongs(songs);

        assertEquals(200, response.getStatusCodeValue());
        assertEquals("✅ Word cloud songs saved successfully.", response.getBody());
    }

    @Test
    public void testAddWordCloudSongsFailure() {
        List<WordCloudSong> songs = Arrays.asList(new WordCloudSong());
        when(wordCloudService.addSongsToWordCloud(songs)).thenReturn(false);

        ResponseEntity<String> response = wordCloudController.addWordCloudSongs(songs);

        assertEquals(500, response.getStatusCodeValue());
        assertEquals("❌ Failed to save word cloud songs.", response.getBody());
    }

    @Test
    public void testGetUserWordCloudWithSongs() {
        String username = "testUser";
        List<WordCloudSong> songs = Arrays.asList(new WordCloudSong());
        when(wordCloudService.getUserWordCloud(username)).thenReturn(songs);

        ResponseEntity<List<WordCloudSong>> response = wordCloudController.getUserWordCloud(username);

        assertEquals(200, response.getStatusCodeValue());
        assertEquals(songs, response.getBody());
    }

    @Test
    public void testGetUserWordCloudEmpty() {
        String username = "emptyUser";
        when(wordCloudService.getUserWordCloud(username)).thenReturn(Collections.emptyList());

        ResponseEntity<List<WordCloudSong>> response = wordCloudController.getUserWordCloud(username);

        assertEquals(204, response.getStatusCodeValue());
        assertNull(response.getBody());
    }

    @Test
    public void testRemoveFromWordCloudSuccess() {
        when(wordCloudService.removeFromWordCloud("user", "song123")).thenReturn(true);

        ResponseEntity<String> response = wordCloudController.removeFromWordCloud("user", "song123");

        assertEquals(200, response.getStatusCodeValue());
        assertEquals("✅ Removed from word cloud.", response.getBody());
    }

    @Test
    public void testRemoveFromWordCloudFailure() {
        when(wordCloudService.removeFromWordCloud("user", "song123")).thenReturn(false);

        ResponseEntity<String> response = wordCloudController.removeFromWordCloud("user", "song123");

        assertEquals(400, response.getStatusCodeValue());
        assertEquals("❌ Failed to remove.", response.getBody());
    }

    @Test
    public void testClearUserWordCloudSuccess() {
        when(wordCloudService.clearUserWordCloud("user")).thenReturn(true);

        ResponseEntity<String> response = wordCloudController.clearUserWordCloud("user");

        assertEquals(200, response.getStatusCodeValue());
        assertEquals("🧹 Word cloud cleared.", response.getBody());
    }

    @Test
    public void testClearUserWordCloudFailure() {
        when(wordCloudService.clearUserWordCloud("user")).thenReturn(false);

        ResponseEntity<String> response = wordCloudController.clearUserWordCloud("user");

        assertEquals(400, response.getStatusCodeValue());
        assertEquals("❌ Failed to clear.", response.getBody());
    }
}
