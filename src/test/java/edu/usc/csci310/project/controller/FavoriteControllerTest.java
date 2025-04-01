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
}
