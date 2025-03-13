package edu.usc.csci310.project.controller;

import edu.usc.csci310.project.services.AuthService;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.HashMap;
import java.util.Map;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(authController).build();
    }

    @Test
    void testSignup() throws Exception {
        Map<String, String> request = new HashMap<>();
        request.put("username", "testUser");
        request.put("password", "password123");

        when(authService.registerUser("testUser", "password123")).thenReturn("User registered successfully");

        mockMvc.perform(post("/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"testUser\", \"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andExpect(content().string("User registered successfully"));

        verify(authService).registerUser("testUser", "password123");
    }

    @Test
    void testLoginSuccess() throws Exception {
        Map<String, String> request = new HashMap<>();
        request.put("username", "testUser");
        request.put("password", "password123");

        when(authService.authenticateUser("testUser", "password123")).thenReturn(true);

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"testUser\", \"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andExpect(content().string("Login successful"));

        verify(authService).authenticateUser("testUser", "password123");
    }

    @Test
    void testLoginFailure() throws Exception {
        when(authService.authenticateUser("wrongUser", "wrongPassword")).thenReturn(false);

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"wrongUser\", \"password\":\"wrongPassword\"}"))
                .andExpect(status().isOk())
                .andExpect(content().string("Invalid username or password"));

        verify(authService).authenticateUser("wrongUser", "wrongPassword");
    }

    @Test
    void testLogout() throws Exception {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("user", "testUser");

        mockMvc.perform(post("/auth/logout")
                        .session(session))
                .andExpect(status().isOk())
                .andExpect(content().string("Logged out successfully"));

        // Verify that session invalidation is called
        assert session.isInvalid();
    }
}
