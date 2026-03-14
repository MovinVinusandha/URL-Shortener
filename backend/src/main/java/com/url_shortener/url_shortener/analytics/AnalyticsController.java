package com.url_shortener.url_shortener.analytics;

import com.url_shortener.url_shortener.analytics.dto.AnalyticsResponseDto;
import com.url_shortener.url_shortener.analytics.dto.DateCountDto;
import com.url_shortener.url_shortener.analytics.dto.StringCountDto;
import com.url_shortener.url_shortener.urls.UrlNotFoundException;
import com.url_shortener.url_shortener.urls.UrlRepository;
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

    private final UrlRepository urlRepository;
    private final ClickEventRepository clickEventRepository;

    @GetMapping("/analytics/{hash}")
    @Operation(summary = "Get detailed analytics for a short URL over the last 30 days")
    public ResponseEntity<AnalyticsResponseDto> getAnalytics(@PathVariable String hash) {
        var url = urlRepository.findByShortUrl(hash);
        if (url == null) {
            throw new UrlNotFoundException();
        }

        // Verify ownership (requires Bearer token)
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UrlNotFoundException();
        }

        Long currentUserId = (Long) authentication.getPrincipal();
        if (url.getUser() == null || !url.getUser().getId().equals(currentUserId)) {
            throw new UrlNotFoundException();
        }

        LocalDateTime startDate = LocalDateTime.now().minusDays(30);
        Long urlId = url.getId();

        Long totalClicksRaw = clickEventRepository.countByUrl_Id(urlId);
        Long totalClicks = totalClicksRaw != null ? totalClicksRaw : 0L;

        List<DateCountDto> clicksByDate = clickEventRepository.countByDateForUrl(urlId, startDate)
                .stream()
                .map(row -> new DateCountDto(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<StringCountDto> clicksByCountry = clickEventRepository.countByCountryForUrl(urlId, startDate)
                .stream()
                .map(row -> new StringCountDto(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<StringCountDto> clicksByDevice = clickEventRepository.countByDeviceForUrl(urlId, startDate)
                .stream()
                .map(row -> new StringCountDto(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<StringCountDto> clicksByBrowser = clickEventRepository.countByBrowserForUrl(urlId, startDate)
                .stream()
                .map(row -> new StringCountDto(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        var response = new AnalyticsResponseDto(
                totalClicks,
                clicksByDate,
                clicksByCountry,
                clicksByDevice,
                clicksByBrowser
        );

        return ResponseEntity.ok(response);
    }
}
