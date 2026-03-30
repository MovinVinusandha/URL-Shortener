package com.url_shortener.url_shortener.analytics;

import com.url_shortener.url_shortener.analytics.dto.AnalyticsResponseDto;
import com.url_shortener.url_shortener.urls.UrlNotFoundException;
import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final UserRepository userRepository;

    @GetMapping("/api/analytics/{hash}")
    @Operation(summary = "Get detailed analytics for a short URL over the last 30 days")
    public ResponseEntity<AnalyticsResponseDto> getAnalytics(@PathVariable String hash) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UrlNotFoundException();
        }

        Long currentUserId = (Long) authentication.getPrincipal();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(UrlNotFoundException::new);

        AnalyticsResponseDto response = analyticsService.getAnalytics(hash, currentUser);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/analytics")
    @Operation(summary = "Get overall analytics for all URLs owned by the current user over the last 30 days")
    public ResponseEntity<AnalyticsResponseDto> getOverallAnalytics() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UrlNotFoundException();
        }

        Long currentUserId = (Long) authentication.getPrincipal();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(UrlNotFoundException::new);

        AnalyticsResponseDto response = analyticsService.getOverallAnalytics(currentUser);
        return ResponseEntity.ok(response);
    }
}
