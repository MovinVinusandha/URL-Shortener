package com.url_shortener.url_shortener.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TokenRevocationServiceTest {

    @Mock
    private StringRedisTemplate stringRedisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private TokenRevocationService tokenRevocationService;

    @BeforeEach
    void setUp() {
        lenient().when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    void revokeToken_StoresInRedisWithRemainingTtl() {
        Date futureExpiration = new Date(System.currentTimeMillis() + 50000);
        tokenRevocationService.revokeToken("sample.jwt.token", futureExpiration);

        verify(valueOperations, times(1)).set(
                startsWith("auth:blacklist:token:"),
                eq("revoked"),
                any(Duration.class)
        );
    }

    @Test
    void revokeToken_DoesNotStoreWhenAlreadyExpired() {
        Date pastExpiration = new Date(System.currentTimeMillis() - 50000);
        tokenRevocationService.revokeToken("sample.jwt.token", pastExpiration);

        verify(valueOperations, never()).set(anyString(), anyString(), any(Duration.class));
    }

    @Test
    void isTokenRevoked_ReturnsTrueWhenKeyExists() {
        when(stringRedisTemplate.hasKey(startsWith("auth:blacklist:token:"))).thenReturn(true);

        boolean revoked = tokenRevocationService.isTokenRevoked("sample.jwt.token");
        assertThat(revoked).isTrue();
    }

    @Test
    void isTokenRevoked_ReturnsFalseWhenKeyDoesNotExist() {
        when(stringRedisTemplate.hasKey(startsWith("auth:blacklist:token:"))).thenReturn(false);

        boolean revoked = tokenRevocationService.isTokenRevoked("sample.jwt.token");
        assertThat(revoked).isFalse();
    }

    @Test
    void revokeAllUserTokens_SetsRevocationTimestamp() {
        tokenRevocationService.revokeAllUserTokens(123L);

        verify(valueOperations, times(1)).set(
                eq("auth:user:revoke_time:123"),
                anyString(),
                eq(Duration.ofDays(7))
        );
    }

    @Test
    void isIssuedBeforeRevocation_ReturnsTrueIfIssuedBeforeRevokeTime() {
        long revokeTime = 1000000L;
        when(valueOperations.get("auth:user:revoke_time:123")).thenReturn(String.valueOf(revokeTime));

        Date issuedAt = new Date(revokeTime - 5000L);
        boolean issuedBefore = tokenRevocationService.isIssuedBeforeRevocation(123L, issuedAt);

        assertThat(issuedBefore).isTrue();
    }

    @Test
    void isIssuedBeforeRevocation_ReturnsFalseIfIssuedAfterRevokeTime() {
        long revokeTime = 1000000L;
        when(valueOperations.get("auth:user:revoke_time:123")).thenReturn(String.valueOf(revokeTime));

        Date issuedAt = new Date(revokeTime + 5000L);
        boolean issuedBefore = tokenRevocationService.isIssuedBeforeRevocation(123L, issuedAt);

        assertThat(issuedBefore).isFalse();
    }

    @Test
    void isIssuedBeforeRevocation_ReturnsFalseIfNoRevocationRecord() {
        when(valueOperations.get("auth:user:revoke_time:123")).thenReturn(null);

        Date issuedAt = new Date(System.currentTimeMillis());
        boolean issuedBefore = tokenRevocationService.isIssuedBeforeRevocation(123L, issuedAt);

        assertThat(issuedBefore).isFalse();
    }
}
