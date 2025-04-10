package edu.usc.csci310.project.controller;

import edu.usc.csci310.project.model.FavoriteSong;
import edu.usc.csci310.project.services.FavoriteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {

    private final FavoriteService favoriteService;

    @Autowired
    public FavoriteController(FavoriteService favoriteService) {
        this.favoriteService = favoriteService;
    }
    @PostMapping("/add")
    public ResponseEntity<String> addFavorite(@RequestBody FavoriteSong favoriteSong) {
        boolean success = favoriteService.addFavorite(
                favoriteSong.getUsername(),
                favoriteSong.getSongId(),
                favoriteSong.getTitle(),
                favoriteSong.getUrl(),
                favoriteSong.getImageUrl(),
                favoriteSong.getReleaseDate(),
                favoriteSong.getArtistName(),
                favoriteSong.getLyrics()
        );

        return success ? ResponseEntity.ok("✅ Song added to favorites")
                : ResponseEntity.badRequest().body("❌ Failed to add song.");
    }




    @GetMapping("/{username}")
    public ResponseEntity<List<FavoriteSong>> getFavorites(@PathVariable String username) {
        List<FavoriteSong> favorites = favoriteService.getFavorites(username);

        return favorites.isEmpty() ? ResponseEntity.noContent().build() : ResponseEntity.ok(favorites);
    }



    @DeleteMapping("/remove/{username}/{songId}")
    public ResponseEntity<String> removeFavorite(@PathVariable String username, @PathVariable String songId) {
        System.out.println("🟡 Removing song with ID: " + songId + " for user: " + username); // Debugging log

        boolean success = favoriteService.removeFavorite(username, songId);

        if (success) {
            System.out.println("✅ Successfully removed song: " + songId);
            return ResponseEntity.ok("✅ Song removed successfully.");
        } else {
            System.out.println("❌ Failed to remove song: " + songId);
            return ResponseEntity.badRequest().body("❌ Failed to remove song.");
        }
    }


    @PostMapping("/swap")
    public ResponseEntity<String> swapRanks(
            @RequestParam(name = "username", required = true) String username,
            @RequestParam(name = "rank1", required = true) int rank1,
            @RequestParam(name = "rank2", required = true) int rank2) {

        System.out.println("📡 Received swap request for user: " + username + " (Rank: " + rank1 + " ↔ " + rank2 + ")");

        boolean success = favoriteService.swapRanks(username, rank1, rank2);

        if (success) {
            System.out.println("✅ Swap successful.");
            return ResponseEntity.ok("✅ Swap successful.");
        } else {
            System.out.println("❌ Failed to swap ranks.");
            return ResponseEntity.badRequest().body("❌ Failed to swap ranks.");
        }
    }


    @GetMapping("/all-wordmaps")
    public ResponseEntity<Map<String, Map<String, Object>>> getAllFavoritesWordMaps() {
        List<String> usernames = favoriteService.getAllUsersWithFavorites();
        Map<String, Map<String, Object>> result = new HashMap<>();

        for (String username : usernames) {
            List<FavoriteSong> songs = favoriteService.getFavorites(username);
            Map<String, Integer> wordMap = generateWordMapFromFavorites(songs);

            Map<String, Object> userData = new HashMap<>();
            userData.put("wordMap", wordMap);
            userData.put("favorites", songs);

            result.put(username, userData);
        }

        return ResponseEntity.ok(result);
    }

    private static final List<String> STOP_WORDS = List.of(
            "the", "and", "a", "to", "of", "in", "is", "it", "you", "that", "on", "for", "with",
            "as", "was", "are", "but", "be", "at", "by", "this", "have", "or", "an", "not", "we"
    );

    private Map<String, Integer> generateWordMapFromFavorites(List<FavoriteSong> songs) {
        Map<String, Integer> wordFreq = new HashMap<>();

        for (FavoriteSong song : songs) {
            String lyrics = song.getLyrics().toLowerCase().replaceAll("[^a-zA-Z\\s]", "");
            String[] words = lyrics.split("\\s+");

            for (String word : words) {
                if (!STOP_WORDS.contains(word)) {
                    wordFreq.put(word, wordFreq.getOrDefault(word, 0) + 1);
                }
            }
        }

        return wordFreq;
    }


}
