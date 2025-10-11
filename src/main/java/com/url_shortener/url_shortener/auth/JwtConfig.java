package com.url_shortener.url_shortener.auth;

import io.jsonwebtoken.security.Keys;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import javax.crypto.SecretKey;

@Data
@Configuration
@ConfigurationProperties(prefix = "spring.jwt")
public class JwtConfig {
    private String secret;
    private int accessTokenExpiration;
    private int refreshTokenExpiration;
    private String rootAdminEmail;
    private String rootAdminPassword;

    public SecretKey getSecretKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }
}
