package edu.usc.csci310.project.services;

import edu.usc.csci310.project.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        authService = new AuthService(userRepository);
    }

    @Test
    void registerUser_UsernameTaken_ReturnsErrorMessage() {
        // Arrange
        when(userRepository.existsByUsername("existingUser")).thenReturn(true);

        // Act
        String result = authService.registerUser("existingUser", "ValidPass1");

        // Assert
        assertEquals("Username already taken", result);
        verify(userRepository, never()).registerUser(anyString(), anyString());
    }

    @Test
    void registerUser_InvalidPassword_ReturnsErrorMessage() {
        // Arrange
        when(userRepository.existsByUsername("newUser")).thenReturn(false);

        // Act
        String result = authService.registerUser("newUser", "weakpassword");

        // Assert
        assertEquals("Password must contain at least one uppercase letter, one lowercase letter, and one number.", result);
        verify(userRepository, never()).registerUser(anyString(), anyString());
    }

    @Test
    void registerUser_ValidUsernameAndPassword_Success() {
        // Arrange
        when(userRepository.existsByUsername("newUser")).thenReturn(false);
        when(userRepository.registerUser("newUser", "ValidPass1")).thenReturn(true);

        // Act
        String result = authService.registerUser("newUser", "ValidPass1");

        // Assert
        assertEquals("User registered successfully", result);
        verify(userRepository).registerUser("newUser", "ValidPass1");
    }

    @Test
    void registerUser_RepositoryError_ReturnsErrorMessage() {
        // Arrange
        when(userRepository.existsByUsername("newUser")).thenReturn(false);
        when(userRepository.registerUser("newUser", "ValidPass1")).thenReturn(false);

        // Act
        String result = authService.registerUser("newUser", "ValidPass1");

        // Assert
        assertEquals("Error registering user", result);
        verify(userRepository).registerUser("newUser", "ValidPass1");
    }

    @Test
    void authenticateUser_UserDoesNotExist_ReturnsFalse() {
        // Arrange
        when(userRepository.getUserPassword("nonExistentUser")).thenReturn(Optional.empty());

        // Act
        boolean result = authService.authenticateUser("nonExistentUser", "AnyPassword1");

        // Assert
        assertFalse(result);
    }

    @Test
    void authenticateUser_IncorrectPassword_ReturnsFalse() {
        // Arrange
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hashedPassword = encoder.encode("CorrectPass1");
        when(userRepository.getUserPassword("existingUser")).thenReturn(Optional.of(hashedPassword));

        // Act
        boolean result = authService.authenticateUser("existingUser", "WrongPass1");

        // Assert
        assertFalse(result);
    }

    @Test
    void authenticateUser_CorrectPassword_ReturnsTrue() {
        // Arrange
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String correctPassword = "CorrectPass1";
        String hashedPassword = encoder.encode(correctPassword);
        when(userRepository.getUserPassword("existingUser")).thenReturn(Optional.of(hashedPassword));

        // Act
        boolean result = authService.authenticateUser("existingUser", correctPassword);

        // Assert
        assertTrue(result);
    }
}