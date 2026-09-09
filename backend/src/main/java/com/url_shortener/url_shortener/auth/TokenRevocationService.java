package com.url_shortener.url_shortener.auth;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.Date;
import java.util.HexFormat;

/**
 * Service managing JWT blacklisting and global session revocation.
 * Backed by Redis for fast, O(1) in-memory checks.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TokenRevocationService {

    private final StringRedisTemplate stringRedisTemplate;

    private static final String BLACKLIST_PREFIX = "auth:blacklist:token:";
    private static final String USER_REVOKE_PREFIX = "auth:user:revoke_time:";

    /**
     * Revokes a specific JWT token until its natural expiration.
     *
     * @param rawToken the compact JWT string
     * @param expirationDate when the token expires
     */
    public void revokeToken(String rawToken, Date expirationDate) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }

        long now = System.currentTimeMillis();
        long remainingMillis = (expirationDate != null) ? expirationDate.getTime() - now : 0;

        if (remainingMillis <= 0) {
            // Already expired, no need to store in Redis
            return;
        }

        String tokenKey = buildTokenKey(rawToken);
        stringRedisTemplate.opsForValue().set(tokenKey, "revoked", Duration.ofMillis(remainingMillis));
        log.debug("Token blacklisted in Redis with TTL {} ms", remainingMillis);
    }

    /**
     * Checks if a token has been explicitly blacklisted.
     *
     * @param rawToken the compact JWT string
     * @return true if blacklisted, false otherwise
     */
    public boolean isTokenRevoked(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return false;
        }

        try {
            String tokenKey = buildTokenKey(rawToken);
            return Boolean.TRUE.equals(stringRedisTemplate.hasKey(tokenKey));
        } catch (Exception e) {
            log.error("Failed to query Redis for token blacklist: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Globally revokes all existing sessions/tokens for a given user.
     * Any token issued at or before the current timestamp will be deemed invalid.
     *
     * @param userId the user ID
     */
    public void revokeAllUserTokens(Long userId) {
        if (userId == null) {
            return;
        }

        try {
            String userKey = USER_REVOKE_PREFIX + userId;
            long now = System.currentTimeMillis();
            // Store epoch timestamp. Retain for 7 days (matching refresh token maximum lifetime)
            stringRedisTemplate.opsForValue().set(userKey, String.valueOf(now), Duration.ofDays(7));
            log.info("Globally revoked all tokens for user id {} at {}", userId, now);
        } catch (Exception e) {
            log.error("Failed to set user revocation timestamp in Redis: {}", e.getMessage());
        }
    }

    /**
     * Checks if a token was issued prior to a user's global revocation timestamp.
     *
     * @param userId the user ID
     * @param issuedAt the token's issuedAt timestamp
     * @return true if the token was issued before the revocation timestamp (invalid)
     */
    public boolean isIssuedBeforeRevocation(Long userId, Date issuedAt) {
        if (userId == null || issuedAt == null) {
            return false;
        }

        try {
            String userKey = USER_REVOKE_PREFIX + userId;
            String val = stringRedisTemplate.opsForValue().get(userKey);
            if (val == null) {
                return false;
            }

            long revokedAtEpoch = Long.parseLong(val);
            return issuedAt.getTime() <= revokedAtEpoch;
        } catch (Exception e) {
            log.error("Failed to check user revocation timestamp in Redis: {}", e.getMessage());
            return false;
        }
    }

    private String buildTokenKey(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return BLACKLIST_PREFIX + HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            // Fallback if SHA-256 is somehow missing
            return BLACKLIST_PREFIX + Integer.toHexString(rawToken.hashCode());
        }
    }
}
