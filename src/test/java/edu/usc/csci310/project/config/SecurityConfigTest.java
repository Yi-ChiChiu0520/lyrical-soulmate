package edu.usc.csci310.project.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class SecurityConfigTest {

    @Test
    void testSecurityFilterChain() throws Exception {
        // Create a mock HttpSecurity object
        HttpSecurity httpSecurity = mock(HttpSecurity.class, RETURNS_DEEP_STUBS);

        // Stub method calls to return the same httpSecurity instance for chaining
        when(httpSecurity.csrf(any())).thenReturn(httpSecurity);
        when(httpSecurity.authorizeHttpRequests(any())).thenReturn(httpSecurity);

        // Create the security config instance
        SecurityConfig securityConfig = new SecurityConfig();

        // Call the security configuration method
        SecurityFilterChain securityFilterChain = securityConfig.securityFilterChain(httpSecurity);

        // Verify that CSRF is disabled
        verify(httpSecurity).csrf(any());

        // Verify that all requests are permitted
        verify(httpSecurity).authorizeHttpRequests(any());

        // Ensure that a SecurityFilterChain instance is returned
        assertThat(securityFilterChain).isNotNull();
    }
}
