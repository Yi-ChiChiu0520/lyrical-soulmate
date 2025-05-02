package edu.usc.csci310.project.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.util.UriUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;

import static java.nio.charset.StandardCharsets.UTF_8;

@RestController
@RequestMapping("/api/genius")
@CrossOrigin(origins = "https://localhost:3000")
public class GeniusProxyController {

    private final String geniusAccessToken;
    private final RestTemplate restTemplate;

    @Autowired
    public GeniusProxyController(RestTemplate restTemplate, @Value("${GENIUS_ACCESS_TOKEN}") String geniusAccessToken) {
        this.restTemplate = restTemplate;
        this.geniusAccessToken = geniusAccessToken;
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

    @GetMapping("/artists/{artistId}/songs")
    public ResponseEntity<String> getArtistSongs(@PathVariable("artistId") Long artistId,
                                                 @RequestParam(value = "page", defaultValue = "1") int page) {

        String url = "https://api.genius.com/artists/" + artistId +
                "/songs?sort=popularity" +
                "&per_page=50" +
                "&page=" + page;

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(geniusAccessToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
        return ResponseEntity.ok(response.getBody());
    }

    // gets songs by a provided artist ID
    @GetMapping("/artists")
    public ResponseEntity<String> combinedArtists(
            @RequestParam("q") String query,
            @RequestParam(value = "pages", defaultValue = "2") int pages
    ) throws IOException {
        String enc = UriUtils.encode(query, UTF_8);
        String htmlUrl  = "https://genius.com/search?q=" + enc;
        String multiUrl = "https://genius.com/api/search/multi?q=" + enc;

        // 1) Load search HTML to get cookies
        Connection.Response htmlResp = Jsoup.connect(htmlUrl)
                .method(Connection.Method.GET)
                .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
                        "AppleWebKit/537.36 (KHTML, like Gecko) " +
                        "Chrome/120.0.0.0 Safari/537.36")
                .timeout(30_000)
                .execute();

        Map<String,String> cookies = htmlResp.cookies();

        // 2) Fetch multi-search JSON using those cookies
        Connection.Response multiResp = Jsoup.connect(multiUrl)
                .cookies(cookies)
                .ignoreContentType(true)
                .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
                        "AppleWebKit/537.36 (KHTML, like Gecko) " +
                        "Chrome/120.0.0.0 Safari/537.36")
                .timeout(30_000)
                .execute();

        String multiJson = multiResp.body();
        ObjectMapper mapper = new ObjectMapper();
        JsonNode sections = mapper.readTree(multiJson)
                .path("response").path("sections");

        // 3) Extract the artist section from multi-search
        Map<Long,ObjectNode> unique = new LinkedHashMap<>();
        for (JsonNode sec : sections) {
            if ("artist".equals(sec.path("type").asText())) {
                for (JsonNode hit : sec.path("hits")) {
                    JsonNode art = hit.path("result");
                    long    id  = art.path("id").asLong();
                    if (!unique.containsKey(id)) {
                        ObjectNode node = mapper.createObjectNode()
                                .put("id",         id)
                                .put("name",       art.path("name").asText())
                                .put("imageUrl",   art.path("image_url").asText(null))
                                .put("headerUrl",  art.path("header_image_url").asText(null));
                        unique.put(id, node);
                    }
                }
                break; // we only need the one artist section
            }
        }

        // 4) Paginate the /api/genius/search endpoint to pull more artists via primary_artist
        HttpHeaders apiHeaders = new HttpHeaders();
        apiHeaders.setBearerAuth(geniusAccessToken);
        HttpEntity<Void> apiEntity = new HttpEntity<>(apiHeaders);

        for (int page = 1; page <= pages; page++) {
            String apiUrl = "https://api.genius.com/search?q=" + enc + "&page=" + page;
            ResponseEntity<String> apiResp = restTemplate.exchange(
                    apiUrl, HttpMethod.GET, apiEntity, String.class
            );
            JsonNode hits = mapper.readTree(apiResp.getBody())
                    .path("response").path("hits");
            if (!hits.isArray() || hits.isEmpty()) break;

            for (JsonNode hit : hits) {
                JsonNode art = hit.path("result").path("primary_artist");
                long    id  = art.path("id").asLong();
                if (!unique.containsKey(id)) {
                    ObjectNode node = mapper.createObjectNode()
                            .put("id",         id)
                            .put("name",       art.path("name").asText())
                            .put("imageUrl",   art.path("image_url").asText(null))
                            .put("headerUrl",  art.path("header_image_url").asText(null));
                    unique.put(id, node);
                }
            }
        }

        // 5) Filter by simple lowercase contains, sort alphabetically
        String qLc = query.toLowerCase();
        ArrayNode out = mapper.createArrayNode();
        unique.values().stream()
                .filter(n -> n.get("name").asText().toLowerCase().contains(qLc))
                .sorted(Comparator.comparing(n -> n.get("name").asText().toLowerCase()))
                .forEach(out::add);

        return ResponseEntity.ok(mapper.writeValueAsString(out));
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
