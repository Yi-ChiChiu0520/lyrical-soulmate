package edu.usc.csci310.project.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.hamcrest.collection.IsCollectionWithSize.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(GeniusProxyController.class)
@WithMockUser
public class GeniusProxyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RestTemplate restTemplate;

    private final String MOCK_SONG_ID = "123456";
    private final String MOCK_SEARCH_QUERY = "test song";

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testCombinedArtists_skipsDuplicateHitsInMultiSearch() throws Exception {
        String query   = "Dupe";
        String enc     = UriUtils.encode(query, StandardCharsets.UTF_8);
        String htmlUrl  = "https://genius.com/search?q=" + enc;
        String multiUrl = "https://genius.com/api/search/multi?q=" + enc;
        String apiUrl1  = "https://api.genius.com/search?q=" + enc + "&page=1";

        // 1) Multi-search JSON with TWO hits both id=1
        String multiJson = """
        {
          "response": {
            "sections": [
              {
                "type": "artist",
                "hits": [
                  {
                    "result": {
                      "id": 1,
                      "name": "DupeArtist",
                      "image_url": "img",
                      "header_image_url": "hdr"
                    }
                  },
                  {
                    "result": {
                      "id": 1,
                      "name": "DupeArtist",
                      "image_url": "img",
                      "header_image_url": "hdr"
                    }
                  }
                ]
              }
            ]
          }
        }
        """;

        // 2) API search returns no hits → breaks immediately
        String apiJson1 = """
        { "response": { "hits": [] } }
        """;

        // Mock the initial HTML fetch (for cookies)
        Connection.Response htmlResp = Mockito.mock(Connection.Response.class);
        when(htmlResp.cookies()).thenReturn(Map.of("foo", "bar"));

        Connection htmlConn  = Mockito.mock(Connection.class);
        when(htmlConn.method(any())).thenReturn(htmlConn);
        when(htmlConn.userAgent(anyString())).thenReturn(htmlConn);
        when(htmlConn.timeout(anyInt())).thenReturn(htmlConn);
        when(htmlConn.execute()).thenReturn(htmlResp);

        // Mock the multi‐search JSON fetch
        Connection.Response multiResp = Mockito.mock(Connection.Response.class);
        when(multiResp.body()).thenReturn(multiJson);

        Connection multiConn = Mockito.mock(Connection.class);
        when(multiConn.cookies(anyMap())).thenReturn(multiConn);
        when(multiConn.ignoreContentType(true)).thenReturn(multiConn);
        when(multiConn.userAgent(anyString())).thenReturn(multiConn);
        when(multiConn.timeout(anyInt())).thenReturn(multiConn);
        when(multiConn.execute()).thenReturn(multiResp);

        try (MockedStatic<Jsoup> jsoup = Mockito.mockStatic(Jsoup.class)) {
            // stub Jsoup.connect(...) for both HTML and multi‐search
            jsoup.when(() -> Jsoup.connect(htmlUrl)).thenReturn(htmlConn);
            jsoup.when(() -> Jsoup.connect(multiUrl)).thenReturn(multiConn);

            // stub the Genius API call
            when(restTemplate.exchange(
                    eq(apiUrl1),
                    eq(HttpMethod.GET),
                    any(HttpEntity.class),
                    eq(String.class)
            )).thenReturn(ResponseEntity.ok(apiJson1));

            // Invoke with pages=1 (so we run the one API iteration)
            mockMvc.perform(get("/api/genius/artists")
                            .param("q", query)
                            .param("pages", "1"))
                    .andExpect(status().isOk())
                    // only one unique artist should come back
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].id").value(1))
                    .andExpect(jsonPath("$[0].name").value("DupeArtist"));
        }
    }

    @Test
    void testCombinedArtists_addsNewArtistAndSkipsDuplicate() throws Exception {
        String query   = "Art";
        String enc     = UriUtils.encode(query, StandardCharsets.UTF_8);
        String htmlUrl  = "https://genius.com/search?q=" + enc;
        String multiUrl = "https://genius.com/api/search/multi?q=" + enc;
        String apiUrl1  = "https://api.genius.com/search?q=" + enc + "&page=1";

        // 1) Multi-search returns one artist (id=1)
        String multiJson = """
        {
          "response": {
            "sections": [
              {
                "type": "artist",
                "hits": [
                  {
                    "result": {
                      "id": 1,
                      "name": "ArtOne",
                      "image_url": "img1",
                      "header_image_url": "hdr1"
                    }
                  }
                ]
              }
            ]
          }
        }
        """;

        // 2) API search page 1 returns a duplicate (id=1) and a new one (id=2)
        String apiJson1 = """
        {
          "response": {
            "hits": [
              {
                "result": {
                  "primary_artist": {
                    "id": 1,
                    "name": "ArtOne",
                    "image_url": "img1",
                    "header_image_url": "hdr1"
                  }
                }
              },
              {
                "result": {
                  "primary_artist": {
                    "id": 2,
                    "name": "ArtTwo",
                    "image_url": "img2",
                    "header_image_url": "hdr2"
                  }
                }
              }
            ]
          }
        }
        """;

        // Mock Jsoup HTML response (to grab cookies)
        Connection.Response htmlResp = Mockito.mock(Connection.Response.class);
        when(htmlResp.cookies()).thenReturn(Map.of("foo", "bar"));

        // Mock Jsoup multi‐search response
        Connection.Response multiResp = Mockito.mock(Connection.Response.class);
        when(multiResp.body()).thenReturn(multiJson);

        // Build two mocked Connection objects, one for HTML fetch and one for JSON fetch
        Connection htmlConn  = Mockito.mock(Connection.class);
        Connection multiConn = Mockito.mock(Connection.class);

        try (MockedStatic<Jsoup> jsoup = Mockito.mockStatic(Jsoup.class)) {
            // stub Jsoup.connect(...) for the HTML fetch
            jsoup.when(() -> Jsoup.connect(htmlUrl)).thenReturn(htmlConn);
            when(htmlConn.method(any())).thenReturn(htmlConn);
            when(htmlConn.userAgent(anyString())).thenReturn(htmlConn);
            when(htmlConn.timeout(anyInt())).thenReturn(htmlConn);
            when(htmlConn.execute()).thenReturn(htmlResp);

            // stub Jsoup.connect(...) for the multi‐search JSON fetch
            jsoup.when(() -> Jsoup.connect(multiUrl)).thenReturn(multiConn);
            when(multiConn.cookies(anyMap())).thenReturn(multiConn);
            when(multiConn.ignoreContentType(true)).thenReturn(multiConn);
            when(multiConn.userAgent(anyString())).thenReturn(multiConn);
            when(multiConn.timeout(anyInt())).thenReturn(multiConn);
            when(multiConn.execute()).thenReturn(multiResp);

            // stub Genius API search
            when(restTemplate.exchange(
                    eq(apiUrl1),
                    eq(HttpMethod.GET),
                    any(HttpEntity.class),
                    eq(String.class)
            )).thenReturn(ResponseEntity.ok(apiJson1));

            // perform the request and verify both artists are returned exactly once
            mockMvc.perform(get("/api/genius/artists")
                            .param("q", query)
                            .param("pages", "1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(2))
                    .andExpect(jsonPath("$[0].id").value(1))
                    .andExpect(jsonPath("$[0].name").value("ArtOne"))
                    .andExpect(jsonPath("$[1].id").value(2))
                    .andExpect(jsonPath("$[1].name").value("ArtTwo"));
        }
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

        when(restTemplate.exchange(
                eq("https://api.genius.com/search?q=" + MOCK_SEARCH_QUERY + "&page=1"),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(String.class)))
                .thenReturn(new ResponseEntity<>(mockSearchResponse, HttpStatus.OK));

        // Perform the test with CSRF token
        mockMvc.perform(get("/api/genius/search")
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
        mockMvc.perform(get("/api/genius/search")
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
        mockMvc.perform(get("/api/genius/lyrics")
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
        mockMvc.perform(get("/api/genius/lyrics")
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
            mockMvc.perform(get("/api/genius/lyrics")
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
            mockMvc.perform(get("/api/genius/lyrics")
                            .param("songId", MOCK_SONG_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.lyrics").value("Unknown"));
        }
    }

    @Test
    void testGetArtistSongs() throws Exception {
        String mockResponse = "{ \"response\": { \"songs\": [] } }";
        when(restTemplate.exchange(
                eq("https://api.genius.com/artists/123456/songs?sort=popularity&per_page=50&page=1"),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(String.class)))
                .thenReturn(new ResponseEntity<>(mockResponse, HttpStatus.OK));

        mockMvc.perform(get("/api/genius/artists/123456/songs")
                        .param("page", "1"))
                .andExpect(status().isOk())
                .andExpect(content().string(mockResponse));
    }

    @Test
    void testCombinedArtists_successfulMatch() throws Exception {
        String query = "Radiohead";
        String encodedQuery = UriUtils.encode(query, StandardCharsets.UTF_8);
        String htmlUrl = "https://genius.com/search?q=" + encodedQuery;
        String multiUrl = "https://genius.com/api/search/multi?q=" + encodedQuery;

        try (MockedStatic<Jsoup> jsoupMock = Mockito.mockStatic(Jsoup.class)) {
            // Mocks for HTML cookie request
            Connection htmlConn = mock(Connection.class);
            Connection.Response htmlResp = mock(Connection.Response.class);
            when(htmlResp.cookies()).thenReturn(Map.of("cookie_key", "cookie_val"));

            // Set up mock behavior for first Jsoup call
            jsoupMock.when(() -> Jsoup.connect(htmlUrl)).thenReturn(htmlConn);
            when(htmlConn.method(Connection.Method.GET)).thenReturn(htmlConn);
            when(htmlConn.userAgent(anyString())).thenReturn(htmlConn);
            when(htmlConn.timeout(anyInt())).thenReturn(htmlConn);
            when(htmlConn.execute()).thenReturn(htmlResp);

            // Mocks for JSON artist search
            Connection multiConn = mock(Connection.class);
            Connection.Response multiResp = mock(Connection.Response.class);
            String multiJson = """
            {
              "response": {
                "sections": [
                  {
                    "type": "artist",
                    "hits": [
                      {
                        "result": {
                          "id": 1,
                          "name": "Radiohead",
                          "image_url": "img.jpg",
                          "header_image_url": "header.jpg"
                        }
                      }
                    ]
                  }
                ]
              }
            }
        """;
            when(multiResp.body()).thenReturn(multiJson);

            // Set up mock behavior for second Jsoup call
            jsoupMock.when(() -> Jsoup.connect(multiUrl)).thenReturn(multiConn);
            when(multiConn.cookies(anyMap())).thenReturn(multiConn);
            when(multiConn.ignoreContentType(true)).thenReturn(multiConn);
            when(multiConn.userAgent(anyString())).thenReturn(multiConn);
            when(multiConn.timeout(anyInt())).thenReturn(multiConn);
            when(multiConn.execute()).thenReturn(multiResp);

            // Genius API fallback result
            String apiJson = """
            {
              "response": {
                "hits": [
                  {
                    "result": {
                      "primary_artist": {
                        "id": 2,
                        "name": "Thom Yorke",
                        "image_url": "img2.jpg",
                        "header_image_url": "header2.jpg"
                      }
                    }
                  }
                ]
              }
            }
        """;
            when(restTemplate.exchange(
                    contains("https://api.genius.com/search?q="),
                    eq(HttpMethod.GET),
                    any(HttpEntity.class),
                    eq(String.class)))
                    .thenReturn(new ResponseEntity<>(apiJson, HttpStatus.OK));

            mockMvc.perform(get("/api/genius/artists")
                            .param("q", "Radiohead")
                            .param("pages", "1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].name").value("Radiohead"))
                    .andExpect(jsonPath("$[1]").doesNotExist()); // only one result

        }
    }

    @Test
    void test_noArtistSection_returnsEmptyArray() throws Exception {
        String query   = "Foo";
        String enc     = UriUtils.encode(query, StandardCharsets.UTF_8);
        String htmlUrl = "https://genius.com/search?q=" + enc;
        String multiUrl= "https://genius.com/api/search/multi?q=" + enc;

        // Only a not_artist section
        String multiJson = """
            {
              "response": {
                "sections": [
                  {
                    "type": "not_artist",
                    "hits": [
                      { "result": { "id": 99, "name": "ShouldBeSkipped" } }
                    ]
                  }
                ]
              }
            }
            """;

        try (MockedStatic<Jsoup> jsoup = Mockito.mockStatic(Jsoup.class)) {
            // Stub HTML fetch
            Connection htmlConn = mock(Connection.class);
            Connection.Response htmlResp = mock(Connection.Response.class);
            jsoup.when(() -> Jsoup.connect(htmlUrl)).thenReturn(htmlConn);
            when(htmlConn.method(Connection.Method.GET)).thenReturn(htmlConn);
            when(htmlConn.userAgent(anyString())).thenReturn(htmlConn);
            when(htmlConn.timeout(anyInt())).thenReturn(htmlConn);
            when(htmlConn.execute()).thenReturn(htmlResp);
            when(htmlResp.cookies()).thenReturn(Collections.emptyMap());

            // Stub multi-search
            Connection multiConn = mock(Connection.class);
            Connection.Response multiResp = mock(Connection.Response.class);
            jsoup.when(() -> Jsoup.connect(multiUrl)).thenReturn(multiConn);
            when(multiConn.cookies(Collections.emptyMap())).thenReturn(multiConn);
            when(multiConn.ignoreContentType(true)).thenReturn(multiConn);
            when(multiConn.userAgent(anyString())).thenReturn(multiConn);
            when(multiConn.timeout(anyInt())).thenReturn(multiConn);
            when(multiConn.execute()).thenReturn(multiResp);
            when(multiResp.body()).thenReturn(multiJson);

            // pages=0 to skip the API pagination loop entirely
            mockMvc.perform(get("/api/genius/artists")
                            .param("q", query)
                            .param("pages", "0"))
                    .andExpect(status().isOk())
                    .andExpect(content().string("[]"));

            // pagination never invoked
            verifyNoInteractions(restTemplate);
        }
    }

    /**
     * 2) sections has an artist → unique gets 1 entry;
     *    pagination page 1 returns empty hits → break out after 1 call
     */
    @Test
    void test_paginationEmptyHits_breaksLoop() throws Exception {
        String query   = "Artist1";
        String enc     = UriUtils.encode(query, StandardCharsets.UTF_8);
        String htmlUrl = "https://genius.com/search?q=" + enc;
        String multiUrl= "https://genius.com/api/search/multi?q=" + enc;

        // One artist in the multi-search
        String multiJson = """
            {
              "response": {
                "sections": [
                  {
                    "type": "artist",
                    "hits": [
                      {
                        "result": {
                          "id": 1,
                          "name": "Artist1",
                          "image_url": "url1",
                          "header_image_url": "hdr1"
                        }
                      }
                    ]
                  }
                ]
              }
            }
            """;

        // API → empty hits array triggers break
        String apiEmptyHits = """
            { "response": { "hits": [] } }
            """;

        try (MockedStatic<Jsoup> jsoup = Mockito.mockStatic(Jsoup.class)) {
            // Stub HTML fetch (same as above)
            Connection htmlConn = mock(Connection.class);
            Connection.Response htmlResp = mock(Connection.Response.class);
            jsoup.when(() -> Jsoup.connect(htmlUrl)).thenReturn(htmlConn);
            when(htmlConn.method(Connection.Method.GET)).thenReturn(htmlConn);
            when(htmlConn.userAgent(anyString())).thenReturn(htmlConn);
            when(htmlConn.timeout(anyInt())).thenReturn(htmlConn);
            when(htmlConn.execute()).thenReturn(htmlResp);
            when(htmlResp.cookies()).thenReturn(Collections.emptyMap());

            // Stub multi-search
            Connection multiConn = mock(Connection.class);
            Connection.Response multiResp = mock(Connection.Response.class);
            jsoup.when(() -> Jsoup.connect(multiUrl)).thenReturn(multiConn);
            when(multiConn.cookies(Collections.emptyMap())).thenReturn(multiConn);
            when(multiConn.ignoreContentType(true)).thenReturn(multiConn);
            when(multiConn.userAgent(anyString())).thenReturn(multiConn);
            when(multiConn.timeout(anyInt())).thenReturn(multiConn);
            when(multiConn.execute()).thenReturn(multiResp);
            when(multiResp.body()).thenReturn(multiJson);

            // Stub RestTemplate for page 1 only
            when(restTemplate.exchange(
                    eq("https://api.genius.com/search?q=" + enc + "&page=1"),
                    eq(HttpMethod.GET),
                    any(HttpEntity.class),
                    eq(String.class))
            ).thenReturn(new ResponseEntity<>(apiEmptyHits, HttpStatus.OK));

            ObjectMapper mapper = new ObjectMapper();
            String expected = mapper.writeValueAsString(
                    List.of(Map.of(
                            "id", 1,
                            "name", "Artist1",
                            "imageUrl", "url1",
                            "headerUrl", "hdr1")));

            mockMvc.perform(get("/api/genius/artists")
                            .param("q", query)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(content().json(expected, false));
        }
    }

    @Test
    void test_malformedHitsNode_breaksLoop() throws Exception {
        String query = "Artist1";
        String enc   = UriUtils.encode(query, StandardCharsets.UTF_8);
        String htmlUrl = "https://genius.com/search?q=" + enc;
        String multiUrl= "https://genius.com/api/search/multi?q=" + enc;

        // One artist in the multi-search
        String multiJson = """
            {
              "response": {
                "sections": [
                  {
                    "type": "artist",
                    "hits": [
                      {
                        "result": {
                          "id": 1,
                          "name": "Artist1",
                          "image_url": "url1",
                          "header_image_url": "hdr1"
                        }
                      }
                    ]
                  }
                ]
              }
            }
            """;

        // API page 1 → "hits" is an OBJECT, not an array
        String apiBadHits = """
        { "response": { "hits": { "bogus": true } } }
        """;

        try (MockedStatic<Jsoup> jsoup = Mockito.mockStatic(Jsoup.class)) {
            // Stub HTML fetch (same as above)
            Connection htmlConn = mock(Connection.class);
            Connection.Response htmlResp = mock(Connection.Response.class);
            jsoup.when(() -> Jsoup.connect(htmlUrl)).thenReturn(htmlConn);
            when(htmlConn.method(Connection.Method.GET)).thenReturn(htmlConn);
            when(htmlConn.userAgent(anyString())).thenReturn(htmlConn);
            when(htmlConn.timeout(anyInt())).thenReturn(htmlConn);
            when(htmlConn.execute()).thenReturn(htmlResp);
            when(htmlResp.cookies()).thenReturn(Collections.emptyMap());

            // Stub multi-search
            Connection multiConn = mock(Connection.class);
            Connection.Response multiResp = mock(Connection.Response.class);
            jsoup.when(() -> Jsoup.connect(multiUrl)).thenReturn(multiConn);
            when(multiConn.cookies(Collections.emptyMap())).thenReturn(multiConn);
            when(multiConn.ignoreContentType(true)).thenReturn(multiConn);
            when(multiConn.userAgent(anyString())).thenReturn(multiConn);
            when(multiConn.timeout(anyInt())).thenReturn(multiConn);
            when(multiConn.execute()).thenReturn(multiResp);
            when(multiResp.body()).thenReturn(multiJson);

            when(restTemplate.exchange(
                    eq("https://api.genius.com/search?q=" + enc + "&page=1"),
                    eq(HttpMethod.GET),
                    any(HttpEntity.class),
                    eq(String.class))
            ).thenReturn(new ResponseEntity<>(apiBadHits, HttpStatus.OK));

            // Expected JSON (just the single artist from the multi-search section)
            ObjectMapper mapper = new ObjectMapper();
            String expected = mapper.writeValueAsString(
                    List.of(Map.of(
                            "id", 1,
                            "name", "Artist1",
                            "imageUrl", "url1",
                            "headerUrl", "hdr1")));

            mockMvc.perform(get("/api/genius/artists").param("q", query))
                    .andExpect(status().isOk())
                    .andExpect(content().json(expected, false));
        }
    }


    /**
     * 3) multi-search returns two artists out of order →
     *    sorted(...) comparator is exercised and final JSON is alphabetical
     */
    @Test
    void test_sortedAlphabetically() throws Exception {
        // 1) Arrange: query="" so the final `.contains("")` filter never removes anything
        String query   = "";
        String enc     = "";
        String htmlUrl = "https://genius.com/search?q=" + enc;
        String multiUrl= "https://genius.com/api/search/multi?q=" + enc;

        // 2) Stub multi-search JSON with two out-of-order artists: Beta then Alpha
        String multiJson = """
        {
          "response": {
            "sections": [
              {
                "type": "artist",
                "hits": [
                  {
                    "result": {
                      "id": 2,
                      "name": "Beta",
                      "image_url": "img2",
                      "header_image_url": "hdr2"
                    }
                  },
                  {
                    "result": {
                      "id": 1,
                      "name": "Alpha",
                      "image_url": "img1",
                      "header_image_url": "hdr1"
                    }
                  }
                ]
              }
            ]
          }
        }
        """;

        try (MockedStatic<Jsoup> jsoup = Mockito.mockStatic(Jsoup.class)) {
            // 3) Stub the initial HTML fetch to return no cookies
            Connection htmlConn = mock(Connection.class);
            Connection.Response htmlResp = mock(Connection.Response.class);
            jsoup.when(() -> Jsoup.connect(htmlUrl)).thenReturn(htmlConn);
            when(htmlConn.method(Connection.Method.GET)).thenReturn(htmlConn);
            when(htmlConn.userAgent(anyString())).thenReturn(htmlConn);
            when(htmlConn.timeout(anyInt())).thenReturn(htmlConn);
            when(htmlConn.execute()).thenReturn(htmlResp);
            when(htmlResp.cookies()).thenReturn(Collections.emptyMap());

            // 4) Stub the multi-search call itself
            Connection multiConn = mock(Connection.class);
            Connection.Response multiResp = mock(Connection.Response.class);
            jsoup.when(() -> Jsoup.connect(multiUrl)).thenReturn(multiConn);
            when(multiConn.cookies(Collections.emptyMap())).thenReturn(multiConn);
            when(multiConn.ignoreContentType(true)).thenReturn(multiConn);
            when(multiConn.userAgent(anyString())).thenReturn(multiConn);
            when(multiConn.timeout(anyInt())).thenReturn(multiConn);
            when(multiConn.execute()).thenReturn(multiResp);
            when(multiResp.body()).thenReturn(multiJson);

            // 5) Act & Assert: call with pages=0 to skip the API loop, then verify sorted output
            mockMvc.perform(get("/api/genius/artists")
                            .param("q",     query)
                            .param("pages","0")
                    )
                    .andExpect(status().isOk())
                    .andExpect(content().json("""
            [
              {
                "id":        1,
                "name":      "Alpha",
                "imageUrl":  "img1",
                "headerUrl": "hdr1"
              },
              {
                "id":        2,
                "name":      "Beta",
                "imageUrl":  "img2",
                "headerUrl": "hdr2"
              }
            ]
        """));
        }
    }
}