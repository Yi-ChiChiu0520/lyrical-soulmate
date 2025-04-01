package edu.usc.csci310.project.controller;

import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.*;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.web.client.RestTemplate;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(GeniusProxyController.class)
@WithMockUser
public class GeniusProxyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RestTemplate restTemplate;

    private final String GENIUS_ACCESS_TOKEN = "hzNuZ98H7BLcGIBa-K84ZV1NO2s63JCIxz2ZWY-ywyeOOaj9B0ldwpa8Nz0OitGV";
    private final String MOCK_SONG_ID = "123456";
    private final String MOCK_SEARCH_QUERY = "test song";

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testSearchSongs() throws Exception {
        // Create a sample Genius API search response
        String mockSearchResponse = "{"
                + "\"meta\": {\"status\": 200},"
                + "\"response\": {"
                + "  \"hits\": ["
                + "    {\"result\": {\"id\": 12345, \"title\": \"Test Song\", \"artist_names\": \"Test Artist\"}},"
                + "    {\"result\": {\"id\": 67890, \"title\": \"Another Test\", \"artist_names\": \"Another Artist\"}}"
                + "  ]"
                + "}"
                + "}";

        // Mock the RestTemplate exchange method for search
        HttpHeaders expectedHeaders = new HttpHeaders();
        expectedHeaders.set("Authorization", "Bearer " + GENIUS_ACCESS_TOKEN);
        HttpEntity<String> expectedEntity = new HttpEntity<>(expectedHeaders);

        when(restTemplate.exchange(
                eq("https://api.genius.com/search?q=" + MOCK_SEARCH_QUERY + "&page=1"),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(String.class)))
                .thenReturn(new ResponseEntity<>(mockSearchResponse, HttpStatus.OK));

        // Perform the test with CSRF token
        mockMvc.perform(MockMvcRequestBuilders.get("/api/genius/search")
                        .with(csrf())
                        .param("q", MOCK_SEARCH_QUERY))
                .andExpect(status().isOk())
                .andExpect(content().string(mockSearchResponse));
    }

    @Test
    void testSearchSongsWithPage() throws Exception {
        // Create a sample Genius API search response
        String mockSearchResponse = "{"
                + "\"meta\": {\"status\": 200},"
                + "\"response\": {"
                + "  \"hits\": ["
                + "    {\"result\": {\"id\": 12345, \"title\": \"Test Song\", \"artist_names\": \"Test Artist\"}},"
                + "    {\"result\": {\"id\": 67890, \"title\": \"Another Test\", \"artist_names\": \"Another Artist\"}}"
                + "  ]"
                + "}"
                + "}";

        // Mock the RestTemplate exchange method for search with page parameter
        when(restTemplate.exchange(
                eq("https://api.genius.com/search?q=" + MOCK_SEARCH_QUERY + "&page=2"),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(String.class)))
                .thenReturn(new ResponseEntity<>(mockSearchResponse, HttpStatus.OK));

        // Perform the test with CSRF token
        mockMvc.perform(MockMvcRequestBuilders.get("/api/genius/search")
                        .with(csrf())
                        .param("q", MOCK_SEARCH_QUERY)
                        .param("page", "2"))
                .andExpect(status().isOk())
                .andExpect(content().string(mockSearchResponse));
    }

    @Test
    void testGetLyrics() throws Exception {
        // Mock the song details response
        String mockSongResponse = "{"
                + "\"meta\": {\"status\": 200},"
                + "\"response\": {"
                + "  \"song\": {"
                + "    \"id\": " + MOCK_SONG_ID + ","
                + "    \"title\": \"Test Song\","
                + "    \"path\": \"/test-song-lyrics\""
                + "  }"
                + "}"
                + "}";

        // Mock the RestTemplate exchange method for getting song details
        when(restTemplate.exchange(
                eq("https://api.genius.com/songs/" + MOCK_SONG_ID),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(String.class)))
                .thenReturn(new ResponseEntity<>(mockSongResponse, HttpStatus.OK));

        // Since we can't mock Jsoup directly in this test,
        // we'll rely on the fallback to "Unknown" lyrics
        // In a more complex setup, we could use PowerMockito to mock static Jsoup methods

        // Perform the test with CSRF token
        mockMvc.perform(MockMvcRequestBuilders.get("/api/genius/lyrics")
                        .with(csrf())
                        .param("songId", MOCK_SONG_ID))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.lyrics").value("Unknown"));
    }

    @Test
    void testGetLyricsError() throws Exception {
        // Mock an error response
        when(restTemplate.exchange(
                eq("https://api.genius.com/songs/" + MOCK_SONG_ID),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(String.class)))
                .thenThrow(new RuntimeException("API Error"));

        // Perform the test with CSRF token
        mockMvc.perform(MockMvcRequestBuilders.get("/api/genius/lyrics")
                        .with(csrf())
                        .param("songId", MOCK_SONG_ID))
                .andExpect(status().is5xxServerError())
                .andExpect(jsonPath("$.lyrics").value("Unknown"));
    }
    @Test
    void testGetLyrics_success_withLyrics() throws Exception {
        // ✅ Simulate Genius API JSON with exact path format
        String wrappedJson = "{\"response\":{\"song\":{\"path\":\"/test-song-lyrics\"}}}";

        when(restTemplate.exchange(
                eq("https://api.genius.com/songs/" + MOCK_SONG_ID),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(String.class)))
                .thenReturn(new ResponseEntity<>(wrappedJson, HttpStatus.OK));

        // ✅ Mock Jsoup static call chain
        try (MockedStatic<Jsoup> jsoupMock = Mockito.mockStatic(Jsoup.class)) {
            Connection mockConnection = mock(Connection.class);
            Connection userAgent = mock(Connection.class);
            Connection timeout = mock(Connection.class);
            Document mockDoc = mock(Document.class);

            // ✅ Simulate two lines of lyrics in two divs
            Element e1 = new Element("div").text("Mocked line 1");
            Element e2 = new Element("div").text("Mocked line 2");
            Elements fakeElements = new Elements(e1, e2);

            when(mockDoc.select("div[class^=Lyrics__Container]")).thenReturn(fakeElements);
            when(mockConnection.userAgent(anyString())).thenReturn(userAgent);
            when(userAgent.timeout(anyInt())).thenReturn(timeout);
            when(timeout.get()).thenReturn(mockDoc);

            jsoupMock.when(() -> Jsoup.connect("https://genius.com/test-song-lyrics"))
                    .thenReturn(mockConnection);

            // ✅ Perform the test and assert line breaks in lyrics
            mockMvc.perform(MockMvcRequestBuilders.get("/api/genius/lyrics")
                            .param("songId", MOCK_SONG_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.lyrics").value("Mocked line 1\nMocked line 2"));
        }
    }
    @Test
    void testGetLyrics_returnsUnknownIfNoLyricsFound() throws Exception {
        // Mock Genius API song response with valid path
        String wrappedJson = "{\"response\":{\"song\":{\"path\":\"/test-song-lyrics\"}}}";

        when(restTemplate.exchange(
                eq("https://api.genius.com/songs/" + MOCK_SONG_ID),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(String.class)))
                .thenReturn(new ResponseEntity<>(wrappedJson, HttpStatus.OK));

        // Mock Jsoup call chain with empty lyrics
        try (MockedStatic<Jsoup> jsoupMock = Mockito.mockStatic(Jsoup.class)) {
            Connection mockConnection = mock(Connection.class);
            Connection userAgent = mock(Connection.class);
            Connection timeout = mock(Connection.class);
            Document mockDoc = mock(Document.class);

            Elements emptyElements = new Elements(); // no lyrics found

            when(mockDoc.select("div[class^=Lyrics__Container]")).thenReturn(emptyElements);
            when(mockConnection.userAgent(anyString())).thenReturn(userAgent);
            when(userAgent.timeout(anyInt())).thenReturn(timeout);
            when(timeout.get()).thenReturn(mockDoc);

            jsoupMock.when(() -> Jsoup.connect("https://genius.com/test-song-lyrics"))
                    .thenReturn(mockConnection);

            // Perform the request and expect "Unknown"
            mockMvc.perform(MockMvcRequestBuilders.get("/api/genius/lyrics")
                            .param("songId", MOCK_SONG_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.lyrics").value("Unknown"));
        }
    }


}