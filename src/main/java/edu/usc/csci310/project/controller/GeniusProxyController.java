package edu.usc.csci310.project.controller;


import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpMethod;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;

@RestController
@RequestMapping("/api/genius")
@CrossOrigin(origins = "http://localhost:3000") // Allow frontend access
public class GeniusProxyController {

    private final String geniusAccessToken = "hzNuZ98H7BLcGIBa-K84ZV1NO2s63JCIxz2ZWY-ywyeOOaj9B0ldwpa8Nz0OitGV";
    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping("/search")
    public ResponseEntity<String> searchSongs(@RequestParam("q") String query) {
        String url = "https://api.genius.com/search?q=" + query;

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + geniusAccessToken);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
        return ResponseEntity.ok(response.getBody());
    }
}