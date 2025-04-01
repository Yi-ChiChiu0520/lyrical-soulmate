package edu.usc.csci310.project.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class UserTest {

    private User user;
    private LocalDateTime lockTime;

    @BeforeEach
    void setUp() {
        lockTime = LocalDateTime.now();
        user = new User("testUser", "testPass", 2, true, lockTime);
    }

    @Test
    void testConstructorAndGetters() {
        assertEquals("testUser", user.getUsername());
        assertEquals("testPass", user.getPassword());
        assertEquals(2, user.getFailedLoginAttempts());
        assertTrue(user.isAccountLocked());
        assertEquals(lockTime, user.getLockTime());
    }

    @Test
    void testSetters() {
        LocalDateTime newLockTime = lockTime.plusMinutes(10);

        user.setUsername("newUser");
        user.setPassword("newPass");
        user.setFailedLoginAttempts(3);
        user.setAccountLocked(false);
        user.setLockTime(newLockTime);

        assertEquals("newUser", user.getUsername());
        assertEquals("newPass", user.getPassword());
        assertEquals(3, user.getFailedLoginAttempts());
        assertFalse(user.isAccountLocked());
        assertEquals(newLockTime, user.getLockTime());
    }
}
