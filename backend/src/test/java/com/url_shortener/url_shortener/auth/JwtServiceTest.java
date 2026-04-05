package com.url_shortener.url_shortener.auth;

import com.url_shortener.url_shortener.users.Role;
import com.url_shortener.url_shortener.users.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtServiceTest {

    @Mock
    private JwtConfig jwtConfig;

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        String secret = "my_super_secret_key_which_must_be_at_least_32_bytes_long";
        var secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        when(jwtConfig.getSecretKey()).thenReturn(secretKey);
        jwtService = new JwtService(jwtConfig);
    }

    @Test
    void generateAccessToken_Success() {
        when(jwtConfig.getAccessTokenExpiration()).thenReturn(3600);
        User user = User.builder().id(1L).email("test@test.com").name("Test").role(Role.USER).build();

        Jwt jwt = jwtService.generateAccessToken(user);

        assertThat(jwt).isNotNull();
        assertThat(jwt.toString()).isNotEmpty();
    }

    @Test
    void parseToken_Success() {
        when(jwtConfig.getAccessTokenExpiration()).thenReturn(3600);
        User user = User.builder().id(1L).email("test@test.com").name("Test").role(Role.USER).build();
        Jwt generated = jwtService.generateAccessToken(user);

        Jwt parsed = jwtService.parseToken(generated.toString());

        assertThat(parsed).isNotNull();
        assertThat(parsed.getUserId()).isEqualTo(1L);
        assertThat(parsed.getRole()).isEqualTo(Role.USER);
    }

    @Test
    void parseToken_Invalid() {
        Jwt parsed = jwtService.parseToken("invalid.token.here");
        assertThat(parsed).isNull();
    }
}
