package edu.usc.csci310.project.controller;

import edu.usc.csci310.project.model.FavoriteSong;
import edu.usc.csci310.project.services.FavoriteService;
import edu.usc.csci310.project.services.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {

    private final FavoriteService favoriteService;
    private final UserService userService; // ✅ now final and injected

    // ✅ Constructor injection for both services
    public FavoriteController(FavoriteService favoriteService, UserService userService) {
        this.favoriteService = favoriteService;
        this.userService = userService;
    }

    @GetMapping("/privacy/{username}")
    public ResponseEntity<Boolean> getPrivacy(
            @PathVariable String username,
            @RequestParam String requester
    ) {
        boolean isPrivate = userService.isFavoritesPrivate(username);
        if (!username.equals(requester) && isPrivate) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(isPrivate);
    }

    @PostMapping("/privacy/{username}")
    public ResponseEntity<Void> updatePrivacy(
            @PathVariable String username,
            @RequestParam boolean isPrivate
    ) {
        userService.setFavoritesPrivacy(username, isPrivate);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/favorites/{username}")
    public ResponseEntity<?> getFavorites(
            @PathVariable String username,
            @RequestParam String requester
    ) {
        boolean isPrivate = userService.isFavoritesPrivate(username);
        if (!username.equals(requester) && isPrivate) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Favorites list is private");
        }
        return ResponseEntity.ok(favoriteService.getFavorites(username));
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
        boolean success = favoriteService.removeFavorite(username, songId);
        return success ?
                ResponseEntity.ok("✅ Song removed successfully.") :
                ResponseEntity.badRequest().body("❌ Failed to remove song.");
    }

    @PostMapping("/swap")
    public ResponseEntity<String> swapRanks(
            @RequestParam String username,
            @RequestParam int rank1,
            @RequestParam int rank2) {
        boolean success = favoriteService.swapRanks(username, rank1, rank2);
        return success ?
                ResponseEntity.ok("✅ Swap successful.") :
                ResponseEntity.badRequest().body("❌ Failed to swap ranks.");
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
