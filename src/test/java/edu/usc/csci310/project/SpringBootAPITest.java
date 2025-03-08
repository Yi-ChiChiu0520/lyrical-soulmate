package edu.usc.csci310.project;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class SpringBootAPITest {

    @Autowired
    private MockMvc mockMvc;
    @Test
    void testApplicationStarts() {
        assertDoesNotThrow(() -> SpringBootAPI.main(new String[]{}));
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
}
