package edu.usc.csci310.project;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.times;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class SpringBootAPITest {

    SpringBootAPI springBootAPI;

    @Autowired
    private MockMvc mockMvc;

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

}
