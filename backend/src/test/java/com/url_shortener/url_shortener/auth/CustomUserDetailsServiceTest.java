package com.url_shortener.url_shortener.auth;

import com.url_shortener.url_shortener.users.Role;
import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomUserDetailsServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CustomUserDetailsService userDetailsService;

    @Test
    void loadUserByUsername_Success() {
        User user = User.builder()
                .id(1L)
                .username("johnny")
                .email("john@example.com")
                .password("encoded_pass")
                .role(Role.USER)
                .build();

        when(userRepository.findByEmailIgnoreCaseOrUsernameIgnoreCase("johnny", "johnny"))
                .thenReturn(Optional.of(user));

        UserDetails userDetails = userDetailsService.loadUserByUsername("johnny");

        assertThat(userDetails.getUsername()).isEqualTo("john@example.com");
        assertThat(userDetails.getPassword()).isEqualTo("encoded_pass");
        assertThat(userDetails.getAuthorities()).extracting("authority").containsExactly("ROLE_USER");
    }

    @Test
    void loadUserByUsername_OAuthUserWithoutPassword_ThrowsBadCredentialsException() {
        User user = User.builder()
                .id(1L)
                .username("google_user")
                .email("google@example.com")
                .password(null) // no password
                .role(Role.USER)
                .build();

        when(userRepository.findByEmailIgnoreCaseOrUsernameIgnoreCase("google@example.com", "google@example.com"))
                .thenReturn(Optional.of(user));

        assertThatThrownBy(() -> userDetailsService.loadUserByUsername("google@example.com"))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("social login");
    }

    @Test
    void loadUserByUsername_NotFound_ThrowsUsernameNotFoundException() {
        when(userRepository.findByEmailIgnoreCaseOrUsernameIgnoreCase("unknown", "unknown"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> userDetailsService.loadUserByUsername("unknown"))
                .isInstanceOf(UsernameNotFoundException.class);
    }
}
