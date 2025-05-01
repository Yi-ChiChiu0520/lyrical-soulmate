package edu.usc.csci310.project.controller;

import edu.usc.csci310.project.model.FavoriteSong;
import edu.usc.csci310.project.repository.FavoriteRepository;
import edu.usc.csci310.project.repository.UserRepository;
import edu.usc.csci310.project.util.HashUtil;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/")
@CrossOrigin(origins = "https://localhost:3000") // adjust as needed
public class SocialController {

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private FavoriteRepository favoriteRepo;

    public SocialController(UserRepository userRepo, FavoriteRepository favoriteRepo) {
        this.userRepo = userRepo;
        this.favoriteRepo = favoriteRepo;
    }

    // Search by raw username prefix
    @GetMapping("/users/search")
    public ResponseEntity<List<String>> searchUsers(@RequestParam String prefix) {
        return ResponseEntity.ok(userRepo.findByRawUsernamePrefix(prefix));
    }

    // Get friends who also favorited the song
    @GetMapping("/songs/{songId}/friends")
    public ResponseEntity<List<String>> getMutuals(
            @PathVariable String songId,
            @RequestParam String user // this is raw_username
    ) {
        Optional<String> hashedOpt = userRepo.getHashedUsernameFromRaw(user);
        if (hashedOpt.isEmpty()) return ResponseEntity.notFound().build();

        String hashedUsername = hashedOpt.get();
        List<String> allUsers = favoriteRepo.findUsernamesBySongId(songId);

        // Return raw usernames of other users (excluding the current user)
        List<String> rawUsernames = new ArrayList<>();
        for (String u : allUsers) {
            if (!u.equals(hashedUsername)) {
                Optional<String> raw = userRepo.getRawUsernameFromHashed(u);
                raw.ifPresent(rawUsernames::add);
            }
        }

        return ResponseEntity.ok(rawUsernames);
    }
}
