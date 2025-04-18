package edu.usc.csci310.project.controller;

import edu.usc.csci310.project.model.FavoriteSong;
import edu.usc.csci310.project.services.FavoriteService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class FavoriteControllerTest {

    @Mock
    private FavoriteService favoriteService;

    @InjectMocks
    private FavoriteController favoriteController;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    public void testAddFavoriteSuccess() {
        FavoriteSong song = new FavoriteSong(
                "user", "song123", "Song Title", "http://song.url",
                "http://image.url", "2023-01-01", "Artist Name", "Sample lyrics", 1
        );

        when(favoriteService.addFavorite(
                eq("user"), eq("song123"), eq("Song Title"),
                eq("http://song.url"), eq("http://image.url"),
                eq("2023-01-01"), eq("Artist Name"), eq("Sample lyrics")
        )).thenReturn(true);

        ResponseEntity<String> response = favoriteController.addFavorite(song);

        assertEquals(200, response.getStatusCodeValue());
        assertEquals("✅ Song added to favorites", response.getBody());
    }

    @Test
    public void testAddFavoriteFailure() {
        FavoriteSong song = new FavoriteSong(
                "user", "song123", "Song Title", "http://song.url",
                "http://image.url", "2023-01-01", "Artist Name", "Sample lyrics", 1
        );

        when(favoriteService.addFavorite(anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString()))
                .thenReturn(false);

        ResponseEntity<String> response = favoriteController.addFavorite(song);

        assertEquals(400, response.getStatusCodeValue());
        assertEquals("❌ Failed to add song.", response.getBody());
    }

    @Test
    public void testGetFavoritesWithResults() {
        List<FavoriteSong> favorites = Arrays.asList(
                new FavoriteSong("user", "song1", "Title 1", "url1", "img1", "2023-01-01", "Artist A", "Lyrics A", 1),
                new FavoriteSong("user", "song2", "Title 2", "url2", "img2", "2023-01-02", "Artist B", "Lyrics B", 2)
        );

        when(favoriteService.getFavorites("user")).thenReturn(favorites);

        ResponseEntity<List<FavoriteSong>> response = favoriteController.getFavorites("user");

        assertEquals(200, response.getStatusCodeValue());
        assertEquals(favorites, response.getBody());
    }

    @Test
    public void testGetFavoritesEmpty() {
        when(favoriteService.getFavorites("user")).thenReturn(Collections.emptyList());

        ResponseEntity<List<FavoriteSong>> response = favoriteController.getFavorites("user");

        assertEquals(204, response.getStatusCodeValue());
        assertNull(response.getBody());
    }

    @Test
    public void testRemoveFavoriteSuccess() {
        when(favoriteService.removeFavorite("user", "song123")).thenReturn(true);

        ResponseEntity<String> response = favoriteController.removeFavorite("user", "song123");

        assertEquals(200, response.getStatusCodeValue());
        assertEquals("✅ Song removed successfully.", response.getBody());
    }

    @Test
    public void testRemoveFavoriteFailure() {
        when(favoriteService.removeFavorite("user", "song123")).thenReturn(false);

        ResponseEntity<String> response = favoriteController.removeFavorite("user", "song123");

        assertEquals(400, response.getStatusCodeValue());
        assertEquals("❌ Failed to remove song.", response.getBody());
    }

    @Test
    public void testSwapRanksSuccess() {
        when(favoriteService.swapRanks("user", 1, 2)).thenReturn(true);

        ResponseEntity<String> response = favoriteController.swapRanks("user", 1, 2);

        assertEquals(200, response.getStatusCodeValue());
        assertEquals("✅ Swap successful.", response.getBody());
    }

    @Test
    public void testSwapRanksFailure() {
        when(favoriteService.swapRanks("user", 1, 2)).thenReturn(false);

        ResponseEntity<String> response = favoriteController.swapRanks("user", 1, 2);

        assertEquals(400, response.getStatusCodeValue());
        assertEquals("❌ Failed to swap ranks.", response.getBody());
    }
    @Test
    public void testGetAllFavoritesWordMaps() {
        // 1. Mock data setup
        String username = "testuser";
        List<String> usernames = List.of(username);
        List<FavoriteSong> favorites = List.of(
                new FavoriteSong(username, "song123", "Hello", "http://song.url",
                        "http://image.url", "2023-01-01", "Artist A",
                        "Love love peace peace and harmony", 1)
        );

        // 2. Mock service methods
        when(favoriteService.getAllUsersWithFavorites()).thenReturn(usernames);
        when(favoriteService.getFavorites(username)).thenReturn(favorites);

        // 3. Call the controller
        ResponseEntity<Map<String, Map<String, Object>>> response = favoriteController.getAllFavoritesWordMaps();

        // 4. Assert top-level structure
        assertEquals(200, response.getStatusCodeValue());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().containsKey(username));

        Map<String, Object> userData = response.getBody().get(username);

        // 5. Assert wordMap
        assertTrue(userData.containsKey("wordMap"));
        Map<String, Integer> wordMap = (Map<String, Integer>) userData.get("wordMap");
        assertEquals(2, wordMap.get("love"));      // not a stop word
        assertEquals(2, wordMap.get("peace"));     // not a stop word
        assertEquals(1, wordMap.get("harmony"));   // not a stop word
        assertNull(wordMap.get("and"));            // "and" is a stop word

        // 6. Assert favorites list
        assertTrue(userData.containsKey("favorites"));
        List<FavoriteSong> returnedFavorites = (List<FavoriteSong>) userData.get("favorites");
        assertEquals(1, returnedFavorites.size());
        assertEquals("song123", returnedFavorites.get(0).getSongId());
    }
    @Test
    public void testGenerateWordMapSkipsBlankWords() {
        String username = "user6";
        // Add extra spaces to ensure a blank string gets split out (like two consecutive spaces)
        List<FavoriteSong> favorites = List.of(
                new FavoriteSong(username, "song6", "BlankWordTest", "", "", "", "", "love  peace   ", 1)
        );

        when(favoriteService.getAllUsersWithFavorites()).thenReturn(List.of(username));
        when(favoriteService.getFavorites(username)).thenReturn(favorites);

        ResponseEntity<Map<String, Map<String, Object>>> response = favoriteController.getAllFavoritesWordMaps();
        Map<String, Map<String, Object>> body = response.getBody();

        Map<String, Integer> wordMap = (Map<String, Integer>) body.get(username).get("wordMap");

        // Validate real words are counted
        assertEquals(1, wordMap.get("love"));
        assertEquals(1, wordMap.get("peace"));

        // Optional: Ensure no blank entry exists
        assertFalse(wordMap.containsKey(""));
    }


}
