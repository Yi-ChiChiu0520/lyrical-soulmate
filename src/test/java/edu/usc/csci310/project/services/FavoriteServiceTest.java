package edu.usc.csci310.project.services;

import edu.usc.csci310.project.model.FavoriteSong;
import edu.usc.csci310.project.repository.FavoriteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class FavoriteServiceTest {

    private FavoriteRepository favoriteRepository;
    private FavoriteService favoriteService;

    @BeforeEach
    void setUp() {
        favoriteRepository = mock(FavoriteRepository.class);
        favoriteService = new FavoriteService(favoriteRepository);
    }

    @Test
    void testAddFavorite() {
        when(favoriteRepository.addFavorite(
                "user1", "song123", "Test Song", "http://url", "http://image",
                "2023-01-01", "Test Artist", "Lyrics here"))
                .thenReturn(true);

        boolean result = favoriteService.addFavorite(
                "user1", "song123", "Test Song", "http://url", "http://image",
                "2023-01-01", "Test Artist", "Lyrics here");

        assertTrue(result);
        verify(favoriteRepository).addFavorite(
                "user1", "song123", "Test Song", "http://url", "http://image",
                "2023-01-01", "Test Artist", "Lyrics here");
    }

    @Test
    void testGetFavorites() {
        FavoriteSong mockSong = new FavoriteSong("user1", "song123", "Test Song", "http://url",
                "http://image", "2023-01-01", "Test Artist", "Lyrics here", 1);

        when(favoriteRepository.getFavorites("user1")).thenReturn(Arrays.asList(mockSong));

        List<FavoriteSong> result = favoriteService.getFavorites("user1");

        assertEquals(1, result.size());
        assertEquals("Test Song", result.get(0).getTitle());
        verify(favoriteRepository).getFavorites("user1");
    }

    @Test
    void testRemoveFavorite() {
        when(favoriteRepository.removeFavorite("user1", "song123")).thenReturn(true);

        boolean result = favoriteService.removeFavorite("user1", "song123");

        assertTrue(result);
        verify(favoriteRepository).removeFavorite("user1", "song123");
    }

    @Test
    void testSwapRanks() {
        when(favoriteRepository.swapRanks("user1", 1, 2)).thenReturn(true);

        boolean result = favoriteService.swapRanks("user1", 1, 2);

        assertTrue(result);
        verify(favoriteRepository).swapRanks("user1", 1, 2);
    }

    @Test
    void testGetAllUsersWithFavorites() {
        List<String> mockUsers = Arrays.asList("user1", "user2");

        when(favoriteRepository.getAllUsersWithFavorites()).thenReturn(mockUsers);

        List<String> result = favoriteService.getAllUsersWithFavorites();

        assertEquals(2, result.size());
        assertEquals("user1", result.get(0));
        assertEquals("user2", result.get(1));

        verify(favoriteRepository).getAllUsersWithFavorites();
    }

}
