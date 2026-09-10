package com.url_shortener.url_shortener.analytics;

import com.url_shortener.url_shortener.analytics.dto.AnalyticsResponseDto;
import com.url_shortener.url_shortener.urls.UrlNotFoundException;
import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final UserRepository userRepository;
    private final EventStreamService eventStreamService;

    @GetMapping("/analytics/{hash}")
    @Operation(summary = "Get detailed analytics for a short URL")
    public ResponseEntity<AnalyticsResponseDto> getAnalytics(
            @PathVariable String hash,
            @RequestParam(name = "period", defaultValue = "all") String period,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String utmSource,
            @RequestParam(required = false) String utmMedium,
            @RequestParam(required = false) String utmCampaign,
            @RequestParam(required = false) String utmTerm,
            @RequestParam(required = false) String utmContent,
            @RequestParam(required = false) String referer,
            Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UrlNotFoundException();
        }

        Long currentUserId = (Long) authentication.getPrincipal();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(UrlNotFoundException::new);

        AnalyticsResponseDto response = analyticsService.getAnalytics(hash, currentUser, period, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/analytics")
    @Operation(summary = "Get overall analytics for all URLs owned by the current user")
    public ResponseEntity<AnalyticsResponseDto> getOverallAnalytics(
            Authentication authentication,
            @RequestParam(name = "period", defaultValue = "all") String period,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String hash,
            @RequestParam(required = false) List<Long> tagId,
            @RequestParam(required = false) Long folderId,
            @RequestParam(required = false) String utmSource,
            @RequestParam(required = false) String utmMedium,
            @RequestParam(required = false) String utmCampaign,
            @RequestParam(required = false) String utmTerm,
            @RequestParam(required = false) String utmContent,
            @RequestParam(required = false) String referer) {
        Long userId = (Long) authentication.getPrincipal();
        User currentUser = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(analyticsService.getOverallAnalytics(currentUser, period, startDate, endDate, hash, tagId, folderId, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer));
    }

    @GetMapping("/analytics/folder/{folderId}")
    public ResponseEntity<AnalyticsResponseDto> getFolderAnalytics(
            @PathVariable Long folderId, 
            Authentication authentication,
            @RequestParam(name = "period", defaultValue = "all") String period,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String utmSource,
            @RequestParam(required = false) String utmMedium,
            @RequestParam(required = false) String utmCampaign,
            @RequestParam(required = false) String utmTerm,
            @RequestParam(required = false) String utmContent,
            @RequestParam(required = false) String referer) {
        Long userId = (Long) authentication.getPrincipal();
        User currentUser = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(analyticsService.getFolderAnalytics(folderId, currentUser, period, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer));
    }

    @GetMapping("/analytics/folder/slug/{slug}")
    public ResponseEntity<AnalyticsResponseDto> getFolderAnalyticsBySlug(
            @PathVariable String slug, 
            Authentication authentication,
            @RequestParam(name = "period", defaultValue = "all") String period,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String utmSource,
            @RequestParam(required = false) String utmMedium,
            @RequestParam(required = false) String utmCampaign,
            @RequestParam(required = false) String utmTerm,
            @RequestParam(required = false) String utmContent,
            @RequestParam(required = false) String referer) {
        Long userId = (Long) authentication.getPrincipal();
        User currentUser = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(analyticsService.getFolderAnalyticsBySlug(slug, currentUser, period, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer));
    }
    @GetMapping("/analytics/usage")
    @Operation(summary = "Get global usage stats for the current user")
    public ResponseEntity<UserUsageStatsDto> getUserUsageStats(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        User currentUser = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(analyticsService.getUserUsageStats(currentUser));
    }

    @GetMapping("/analytics/events")
    @Operation(summary = "Get paginated raw click events stream for the current user")
    public ResponseEntity<org.springframework.data.domain.Page<com.url_shortener.url_shortener.analytics.dto.ClickEventDto>> getEvents(
            Authentication authentication,
            @RequestParam(name = "period", defaultValue = "all") String period,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String hash,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String device,
            @RequestParam(required = false) String browser,
            @RequestParam(required = false) String os,
            @RequestParam(required = false) String campaign,
            @RequestParam(required = false) String search,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "30") int size
    ) {
        Long userId = (Long) authentication.getPrincipal();
        User currentUser = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                Math.max(0, page),
                Math.min(100, Math.max(1, size))
        );

        return ResponseEntity.ok(analyticsService.getPaginatedEvents(
                currentUser, period, startDate, endDate, hash, country, city, device, browser, os, campaign, search, pageable
        ));
    }

    @GetMapping(value = "/analytics/events/stream", produces = org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Subscribe to live real-time click events stream via Server-Sent Events (SSE)")
    public org.springframework.web.servlet.mvc.method.annotation.SseEmitter streamEvents(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return eventStreamService.subscribe(userId);
    }
}
