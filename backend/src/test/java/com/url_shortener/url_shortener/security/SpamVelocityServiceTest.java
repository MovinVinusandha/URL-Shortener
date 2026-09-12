package com.url_shortener.url_shortener.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SpamVelocityServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;
    @Mock
    private SecurityIncidentRepository incidentRepository;

    @InjectMocks
    private SpamVelocityService spamVelocityService;

    @Test
    void checkAndRecordVelocity_WithinThreshold_Passes() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment("rate:spam:velocity:user:42")).thenReturn(5L);

        assertThatCode(() -> spamVelocityService.checkAndRecordVelocity(42L, "user@test.com", "1.2.3.4"))
                .doesNotThrowAnyException();

        verify(incidentRepository, never()).save(any());
    }

    @Test
    void checkAndRecordVelocity_FirstIncrement_SetsExpiry() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment("rate:spam:velocity:user:42")).thenReturn(1L);

        spamVelocityService.checkAndRecordVelocity(42L, "user@test.com", "1.2.3.4");

        verify(redisTemplate).expire(eq("rate:spam:velocity:user:42"), eq(Duration.ofSeconds(60)));
    }

    @Test
    void checkAndRecordVelocity_ExceedsThreshold_ThrowsAndLogsIncident() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment("rate:spam:velocity:ip:10.0.0.1")).thenReturn(21L);

        assertThatThrownBy(() -> spamVelocityService.checkAndRecordVelocity(null, null, "10.0.0.1"))
                .isInstanceOf(SpamVelocityExceededException.class)
                .hasMessageContaining("Rate limit exceeded");

        verify(incidentRepository, times(1)).save(any(SecurityIncident.class));
    }
}
