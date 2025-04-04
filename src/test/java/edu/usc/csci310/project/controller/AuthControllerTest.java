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

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

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
        when(authService.registerUser("testUser", "Password123")).thenReturn("User registered successfully");

        mockMvc.perform(post("/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"testUser\",\"password\":\"Password123\"}"))
                .andExpect(status().isOk())
                .andExpect(content().string("User registered successfully"));

        verify(authService).registerUser("testUser", "Password123");
    }

    @Test
    void testLoginSuccess() throws Exception {
        when(authService.loginWithLockout("testUser", "Password123")).thenReturn(200);

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"testUser\",\"password\":\"Password123\"}"))
                .andExpect(status().isOk())
                .andExpect(content().string("Login successful"));

        verify(authService).loginWithLockout("testUser", "Password123");
    }

    @Test
    void testLoginLocked() throws Exception {
        when(authService.loginWithLockout("testUser", "Password123")).thenReturn(423);

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"testUser\",\"password\":\"Password123\"}"))
                .andExpect(status().isLocked())
                .andExpect(content().string("Account temporarily locked. Please try again shortly."));

        verify(authService).loginWithLockout("testUser", "Password123");
    }

    @Test
    void testLoginUnauthorized() throws Exception {
        when(authService.loginWithLockout("testUser", "wrongPassword")).thenReturn(401);

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"testUser\",\"password\":\"wrongPassword\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().string("Invalid username or password"));

        verify(authService).loginWithLockout("testUser", "wrongPassword");
    }

    @Test
    void testLogout() throws Exception {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("user", "testUser");

        mockMvc.perform(post("/auth/logout").session(session))
                .andExpect(status().isOk())
                .andExpect(content().string("Logged out successfully"));
    }

    @Test
    void testDeleteUserSuccess() throws Exception {
        when(authService.deleteUser("testUser")).thenReturn(true);

        mockMvc.perform(delete("/auth/delete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"testUser\"}"))
                .andExpect(status().isOk())
                .andExpect(content().string("User deleted successfully"));

        verify(authService).deleteUser("testUser");
    }

    @Test
    void testDeleteUserFailure() throws Exception {
        when(authService.deleteUser("testUser")).thenReturn(false);

        mockMvc.perform(delete("/auth/delete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"testUser\"}"))
                .andExpect(status().isOk())
                .andExpect(content().string("User deletion failed"));

        verify(authService).deleteUser("testUser");
    }
}
