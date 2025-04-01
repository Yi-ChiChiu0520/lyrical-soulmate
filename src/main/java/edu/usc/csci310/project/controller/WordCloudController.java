package edu.usc.csci310.project.controller;

import edu.usc.csci310.project.model.WordCloudSong;
import edu.usc.csci310.project.services.WordCloudService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wordcloud")
@CrossOrigin(origins = "http://localhost:3000")
public class WordCloudController {

    private final WordCloudService wordCloudService;

    @Autowired
    public WordCloudController(WordCloudService wordCloudService) {
        this.wordCloudService = wordCloudService;
    }

    @PostMapping("/add")
    public ResponseEntity<String> addWordCloudSongs(@RequestBody List<WordCloudSong> songs) {
        boolean success = wordCloudService.addSongsToWordCloud(songs);
        if (success) {
            return ResponseEntity.ok("✅ Word cloud songs saved successfully.");
        } else {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("❌ Failed to save word cloud songs.");
        }
    }


    @GetMapping("/{username}")
    public ResponseEntity<List<WordCloudSong>> getUserWordCloud(@PathVariable String username) {
        List<WordCloudSong> songs = wordCloudService.getUserWordCloud(username);
        return songs.isEmpty() ? ResponseEntity.noContent().build() : ResponseEntity.ok(songs);
    }

    @DeleteMapping("/remove/{username}/{songId}")
    public ResponseEntity<String> removeFromWordCloud(@PathVariable String username, @PathVariable String songId) {
        boolean success = wordCloudService.removeFromWordCloud(username, songId);
        return success ? ResponseEntity.ok("✅ Removed from word cloud.")
                : ResponseEntity.badRequest().body("❌ Failed to remove.");
    }

    @DeleteMapping("/clear/{username}")
    public ResponseEntity<String> clearUserWordCloud(@PathVariable String username) {
        boolean success = wordCloudService.clearUserWordCloud(username);
        return success ? ResponseEntity.ok("🧹 Word cloud cleared.")
                : ResponseEntity.badRequest().body("❌ Failed to clear.");
    }
}
