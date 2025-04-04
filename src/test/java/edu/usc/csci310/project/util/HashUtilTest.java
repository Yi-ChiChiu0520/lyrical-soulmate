package edu.usc.csci310.project.util;

import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;

import java.lang.reflect.InvocationTargetException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class HashUtilTest {

    @Test
    public void testHashUsername_validInput() {
        String input = "testUser";
        String hashed = HashUtil.hashUsername(input);

        assertNotNull(hashed);
        assertEquals(64, hashed.length()); // SHA-256 -> 256 bits = 64 hex chars
    }

    @Test
    public void testHashUsername_throwsNoSuchAlgorithmException() {
        try (MockedStatic<MessageDigest> mocked = mockStatic(MessageDigest.class)) {
            mocked.when(() -> MessageDigest.getInstance("SHA-256"))
                    .thenThrow(new NoSuchAlgorithmException("SHA-256 not available"));

            RuntimeException ex = assertThrows(RuntimeException.class, () -> {
                HashUtil.hashUsername("failTest");
            });

            assertTrue(ex.getMessage().contains("Error hashing username"));
        }
    }

    @Test
    public void testPrivateConstructor_throwsException() throws Exception {
        var constructor = HashUtil.class.getDeclaredConstructor();
        constructor.setAccessible(true);

        try {
            constructor.newInstance();
            fail("Expected UnsupportedOperationException to be thrown");
        } catch (InvocationTargetException e) {
            Throwable cause = e.getCause();
            assertTrue(cause instanceof UnsupportedOperationException);
            assertEquals("Utility class", cause.getMessage());
        }
    }



}
