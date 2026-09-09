package com.url_shortener.url_shortener.common;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class RateLimiterService {

    // Cache with keys expiring after 15 minutes
    private final Cache<String, AtomicInteger> requestCounts = Caffeine.newBuilder()
            .expireAfterWrite(15, TimeUnit.MINUTES)
            .maximumSize(50000)
            .build();

    public boolean tryAcquire(String key, int maxRequests) {
        AtomicInteger counter = requestCounts.get(key, k -> new AtomicInteger(0));
        return counter.incrementAndGet() <= maxRequests;
    }

    public boolean checkLoginAttempts(String ip, String identifier) {
        String key = "login:" + ip + ":" + identifier.toLowerCase();
        return tryAcquire(key, 10);
    }

    public boolean checkForgotPassword(String ip, String email) {
        String key = "forgot_password:" + ip + ":" + email.toLowerCase();
        return tryAcquire(key, 3);
    }

    public boolean checkResendVerification(String email) {
        String key = "resend_verify:" + email.toLowerCase();
        // Allow at most 2 requests within the window
        return tryAcquire(key, 2);
    }

    public boolean checkRegistration(String ip) {
        String key = "register:" + ip;
        // Allow up to 10 registrations per IP per 15-minute window
        return tryAcquire(key, 10);
    }

    public void resetLoginAttempts(String ip, String identifier) {
        requestCounts.invalidate("login:" + ip + ":" + identifier.toLowerCase());
    }
}
