package com.url_shortener.url_shortener.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class SpamVelocityService {

    private final StringRedisTemplate redisTemplate;
    private final SecurityIncidentRepository incidentRepository;

    private static final int DEFAULT_MAX_LINKS_PER_MINUTE = 20;

    /**
     * Records link creation and verifies velocity limits.
     * Throws SpamVelocityExceededException if burst rate is breached.
     */
    public void checkAndRecordVelocity(Long userId, String userEmail, String clientIp) {
        String identifier = userId != null ? "user:" + userId : "ip:" + (clientIp != null ? clientIp : "unknown");
        String key = "rate:spam:velocity:" + identifier;

        try {
            Long currentCount = redisTemplate.opsForValue().increment(key);
            if (currentCount != null && currentCount == 1) {
                redisTemplate.expire(key, Duration.ofSeconds(60));
            }

            int threshold = DEFAULT_MAX_LINKS_PER_MINUTE;
            if (currentCount != null && currentCount > threshold) {
                log.warn("Spam velocity threshold exceeded for {}: {} links created in 60s", identifier, currentCount);

                // Only record incident on first breach and significant multipliers to prevent log exhaustion
                if (currentCount == threshold + 1 || currentCount % 10 == 0) {
                    SecurityIncident incident = SecurityIncident.builder()
                            .incidentType("SPAM_VELOCITY_SPIKE")
                            .severity(currentCount > 40 ? "CRITICAL" : "HIGH")
                            .clientIp(clientIp)
                            .userEmail(userEmail)
                            .targetUrl("High-velocity short link creation")
                            .details(String.format("Burst velocity exceeded: %d short links created in 60 seconds (Limit: %d/min).", currentCount, threshold))
                            .isResolved(false)
                            .build();
                    incidentRepository.save(incident);
                }

                throw new SpamVelocityExceededException(
                        "Rate limit exceeded: You are creating links too quickly. Please wait a moment before trying again."
                );
            }
        } catch (SpamVelocityExceededException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error checking spam velocity in Redis: {}", e.getMessage());
            // Graceful degradation: do not block legitimate requests if Redis has transient issues
        }
    }
}
