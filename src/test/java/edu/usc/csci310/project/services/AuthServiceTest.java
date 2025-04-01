package edu.usc.csci310.project.services;

import edu.usc.csci310.project.model.User;
import edu.usc.csci310.project.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthServiceTest {

    private UserRepository userRepository;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        authService = new AuthService(userRepository);
    }

    // ───────── registerUser ─────────

    @Test
    void testRegisterUserFailsWhenUsernameTaken() {
        when(userRepository.existsByUsername("existing")).thenReturn(true);
        String result = authService.registerUser("existing", "Password1");
        assertEquals("Username already taken", result);
    }

    @Test
    void testRegisterUserFailsWhenPasswordInvalid() {
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        String result = authService.registerUser("newuser", "weak");
        assertEquals("Password must contain at least one uppercase letter, one lowercase letter, and one number.", result);
    }

    @Test
    void testRegisterUserSuccess() {
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(userRepository.registerUser(eq("newuser"), anyString())).thenReturn(true);

        String result = authService.registerUser("newuser", "StrongPass1");
        assertEquals("User registered successfully", result);
    }

    @Test
    void testRegisterUserFailsOnInsert() {
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(userRepository.registerUser(eq("newuser"), anyString())).thenReturn(false);

        String result = authService.registerUser("newuser", "StrongPass1");
        assertEquals("Error registering user", result);
    }

    // ───────── loginWithLockout ─────────

    @Test
    void testLoginSuccessResetsState() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hashed = encoder.encode("Password1");

        User user = new User("user", hashed, 2, false, null);
        when(userRepository.findByUsername("user")).thenReturn(Optional.of(user));

        int status = authService.loginWithLockout("user", "Password1");

        assertEquals(200, status);
        verify(userRepository).updateUser(argThat(updated ->
                !updated.isAccountLocked() &&
                        updated.getFailedLoginAttempts() == 0 &&
                        updated.getLockTime() == null
        ));
    }

    @Test
    void testLoginWrongPasswordIncrementsAttempts() {
        String hashed = new BCryptPasswordEncoder().encode("CorrectPass");

        User user = new User("user", hashed, 0, false, null);
        when(userRepository.findByUsername("user")).thenReturn(Optional.of(user));

        int status = authService.loginWithLockout("user", "WrongPass");
        assertEquals(401, status);
        verify(userRepository).updateUser(argThat(u -> u.getFailedLoginAttempts() == 1));
    }

    @Test
    void testLoginLocksAccountAfterThreeFailures() {
        String hashed = new BCryptPasswordEncoder().encode("CorrectPass");

        User user = new User("user", hashed, 2, false, null);
        when(userRepository.findByUsername("user")).thenReturn(Optional.of(user));

        int status = authService.loginWithLockout("user", "WrongPass");
        assertEquals(401, status);
        verify(userRepository).updateUser(argThat(u -> u.isAccountLocked() && u.getFailedLoginAttempts() == 3));
    }

    @Test
    void testLoginFailsWhenAccountLockedAndStillLocked() {
        User user = new User("user", "pass", 3, true, LocalDateTime.now());
        when(userRepository.findByUsername("user")).thenReturn(Optional.of(user));

        int status = authService.loginWithLockout("user", "pass");
        assertEquals(423, status); // Locked
    }

    @Test
    void testLoginUnlocksAfterTimeout() {
        String hashed = new BCryptPasswordEncoder().encode("Password1");

        LocalDateTime past = LocalDateTime.now().minusSeconds(35);
        User user = new User("user", hashed, 3, true, past);

        when(userRepository.findByUsername("user")).thenReturn(Optional.of(user));

        int status = authService.loginWithLockout("user", "Password1");

        assertEquals(200, status);
        verify(userRepository).updateUser(argThat(u -> !u.isAccountLocked()));
    }

    @Test
    void testLoginFailsWhenUserNotFound() {
        when(userRepository.findByUsername("nouser")).thenReturn(Optional.empty());
        assertEquals(401, authService.loginWithLockout("nouser", "pass"));
    }

    // ───────── deleteUser ─────────

    @Test
    void testDeleteUserSuccess() {
        when(userRepository.deleteByUsername("john")).thenReturn(true);
        assertTrue(authService.deleteUser("john"));
    }

    @Test
    void testDeleteUserFails() {
        when(userRepository.deleteByUsername("jane")).thenReturn(false);
        assertFalse(authService.deleteUser("jane"));
    }

    @Test
    void testDeleteUserException() {
        when(userRepository.deleteByUsername("oops")).thenThrow(new RuntimeException("Boom"));
        assertFalse(authService.deleteUser("oops"));
    }
}
