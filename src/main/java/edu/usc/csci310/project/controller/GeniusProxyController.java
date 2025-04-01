package edu.usc.csci310.project.controller;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.select.Elements;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;

@RestController
@RequestMapping("/api/genius")
@CrossOrigin(origins = "http://localhost:3000")
public class GeniusProxyController {

    private final String geniusAccessToken = "hzNuZ98H7BLcGIBa-K84ZV1NO2s63JCIxz2ZWY-ywyeOOaj9B0ldwpa8Nz0OitGV";
    private final RestTemplate restTemplate;

    @Autowired
    public GeniusProxyController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @GetMapping("/search")
    public ResponseEntity<String> searchSongs(@RequestParam("q") String query,
                                              @RequestParam(value = "page", defaultValue = "1") int page) {
        String url = "https://api.genius.com/search?q=" + query + "&page=" + page;

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + geniusAccessToken);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
        return ResponseEntity.ok(response.getBody());
    }

    @GetMapping("/lyrics")
    public ResponseEntity<?> getLyrics(@RequestParam("songId") String songId) {
        try {
            String url = "https://api.genius.com/songs/" + songId;
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + geniusAccessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> songResponse = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            String json = songResponse.getBody();

            String path = json.split("\"path\":\"")[1].split("\"")[0];
            String lyricsUrl = "https://genius.com" + path;

            Document doc = Jsoup.connect(lyricsUrl)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                    .timeout(30000)
                    .get();

            Elements containers = doc.select("div[class^=Lyrics__Container]");
            StringBuilder lyricsBuilder = new StringBuilder();
            containers.forEach(element -> lyricsBuilder.append(element.text()).append("\n"));

            String lyrics = lyricsBuilder.toString().trim();
            if (lyrics.isEmpty()) {
                lyrics = "Unknown";
            }

            return ResponseEntity.ok(Collections.singletonMap("lyrics", lyrics));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Collections.singletonMap("lyrics", "Unknown"));
        }
    }
}
