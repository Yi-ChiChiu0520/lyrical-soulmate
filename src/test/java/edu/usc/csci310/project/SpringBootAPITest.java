package edu.usc.csci310.project;

import io.github.cdimascio.dotenv.Dotenv;
import io.github.cdimascio.dotenv.DotenvBuilder;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class SpringBootAPITest {

    SpringBootAPI springBootAPI;

    @Autowired
    private MockMvc mockMvc;

    @Mock
    private Dotenv dotenv;

    @Test
    void testApplicationStarts() {
        springBootAPI = new SpringBootAPI();
        try (MockedStatic<SpringApplication> springApplication = mockStatic(SpringApplication.class)) {
            springBootAPI.main(new String[] {});
            springApplication.verify(() -> SpringApplication.run(SpringBootAPI.class, new String[] {}), times(1));
        }
    }

    @Test
    void testRedirectToHomePage() throws Exception {
        mockMvc.perform(get("/some-random-route"))
                .andExpect(status().isOk()) // Expect HTTP 200 OK
                .andExpect(forwardedUrl("/"));
    }

    @Test
    void testRedirectIgnoresAPIPaths() throws Exception {
        mockMvc.perform(get("/api/test"))
                .andExpect(status().isNotFound()); // Expect HTTP 404 for API routes
    }

    @Test
    void throwsWhenTokenMissing() {
        // one mock for the whole fluent chain
        DotenvBuilder mockDotenv = mock(DotenvBuilder.class);

        // stub the chain: configure() → ignoreIfMissing() → load()
        when(mockDotenv.ignoreIfMissing()).thenReturn(mockDotenv);
        when(mockDotenv.load()).thenReturn(dotenv);
        when(dotenv.get("GENIUS_ACCESS_TOKEN")).thenReturn(null);

        try (MockedStatic<Dotenv> dotenvStatic = mockStatic(Dotenv.class)) {
            dotenvStatic.when(Dotenv::configure).thenReturn(mockDotenv);
            assertThrows(IllegalStateException.class,
                    () -> SpringBootAPI.main(new String[]{}));
        }
    }
}
