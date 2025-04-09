package edu.usc.csci310.project.controller;

import edu.usc.csci310.project.repository.FavoriteRepository;
import edu.usc.csci310.project.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SocialControllerTest {

    private SocialController controller;
    private UserRepository userRepo;
    private FavoriteRepository favoriteRepo;


    @BeforeEach
    void setUp() {
        userRepo = mock(UserRepository.class);
        favoriteRepo = mock(FavoriteRepository.class);

        controller = new SocialController(userRepo, favoriteRepo); // ✅ inject via constructor
    }


    @Test
    void testSearchUsers() {
        List<String> mockResults = Arrays.asList("alice", "alex", "alvin");
        when(userRepo.findByRawUsernamePrefix("al")).thenReturn(mockResults);

        ResponseEntity<List<String>> response = controller.searchUsers("al");

        assertEquals(200, response.getStatusCodeValue());
        assertEquals(mockResults, response.getBody());
    }

    @Test
    void testGetMutuals_found() {
        String songId = "123";
        String rawUsername = "john";
        String hashedUsername = "abc123";

        when(userRepo.getHashedUsernameFromRaw("john")).thenReturn(Optional.of(hashedUsername));
        when(favoriteRepo.findUsernamesBySongId(songId)).thenReturn(List.of(hashedUsername, "xyz789"));
        when(userRepo.getRawUsernameFromHashed("xyz789")).thenReturn(Optional.of("jane"));

        ResponseEntity<List<String>> response = controller.getMutuals(songId, rawUsername);

        assertEquals(200, response.getStatusCodeValue());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().contains("jane"));
        assertFalse(response.getBody().contains("john"));
    }

    @Test
    void testGetMutuals_notFound() {
        when(userRepo.getHashedUsernameFromRaw("nonexistent")).thenReturn(Optional.empty());

        ResponseEntity<List<String>> response = controller.getMutuals("123", "nonexistent");

        assertEquals(404, response.getStatusCodeValue());
    }
}
