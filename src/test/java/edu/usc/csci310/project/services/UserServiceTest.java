package edu.usc.csci310.project.services;

import edu.usc.csci310.project.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

public class UserServiceTest {

    private UserRepository userRepository;
    private UserService userService;

    @BeforeEach
    public void setUp() {
        userRepository = mock(UserRepository.class);
        userService = new UserService(userRepository);
    }

    @Test
    public void testIsFavoritesPrivate_ReturnsTrue() {
        when(userRepository.isFavoritesPrivate("testuser")).thenReturn(true);

        boolean result = userService.isFavoritesPrivate("testuser");

        assertTrue(result);
        verify(userRepository).isFavoritesPrivate("testuser");
    }

    @Test
    public void testIsFavoritesPrivate_ReturnsFalse() {
        when(userRepository.isFavoritesPrivate("testuser")).thenReturn(false);

        boolean result = userService.isFavoritesPrivate("testuser");

        assertFalse(result);
        verify(userRepository).isFavoritesPrivate("testuser");
    }

    @Test
    public void testSetFavoritesPrivacy_UpdatesPrivacy() {
        userService.setFavoritesPrivacy("testuser", true);

        verify(userRepository).updateFavoritesPrivacy("testuser", true);
    }
}
