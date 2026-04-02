package com.url_shortener.url_shortener.analytics;

import com.url_shortener.url_shortener.urls.UrlRepository;
import com.url_shortener.url_shortener.urls.FolderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import com.url_shortener.url_shortener.analytics.dto.AnalyticsResponseDto;
import com.url_shortener.url_shortener.analytics.dto.ClickDataPoint;
import com.url_shortener.url_shortener.analytics.dto.CountryDataPoint;
import com.url_shortener.url_shortener.analytics.dto.DeviceDataPoint;
import com.url_shortener.url_shortener.analytics.dto.BrowserDataPoint;
import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.Role;

/**
 * Asynchronous analytics orchestrator that records a {@link ClickEvent}
 * for every short URL access.
 * <p>
 * All work happens on the {@code analyticsExecutor} thread pool (configured in
 * {@code AsyncConfig}) — the HTTP request thread returns the 302 redirect
 * immediately and does not wait for this method to complete.
 * <p>
 * This service is intentionally defensive: any exception that occurs (DB outage,
 * service failure, etc.) is caught and logged. Analytics failures must never
 * surface as errors to the end user.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsService {

    private final UrlRepository            urlRepository;
    private final FolderRepository         folderRepository;
    private final ClickEventRepository     clickEventRepository;
    private final UserAgentParserService   userAgentParserService;
    private final GeoLocationService       geoLocationService;

    public UserUsageStatsDto getUserUsageStats(User currentUser) {
        long totalLinks = urlRepository.countByUserId(currentUser.getId());
        long totalClicks = clickEventRepository.countTotalClicksByUserId(currentUser.getId());
        return UserUsageStatsDto.builder()
                .totalLinks(totalLinks)
                .totalClicks(totalClicks)
                .build();
    }

    public AnalyticsResponseDto getAnalytics(String hash, User currentUser, String period) {
        var url = urlRepository.findByShortUrl(hash);
        if (url == null) {
            throw new com.url_shortener.url_shortener.urls.UrlNotFoundException();
        }

        boolean isRoot = currentUser.getRole() != null && currentUser.getRole() == Role.ROOT;

        if (!isRoot && (url.getUser() == null || !url.getUser().getId().equals(currentUser.getId()))) {
            throw new com.url_shortener.url_shortener.urls.UrlNotFoundException();
        }

        Long urlId = url.getId();
        LocalDateTime startDate = getStartDateFromPeriod(period);

        Long totalClicksRaw = clickEventRepository.countByUrl_Id(urlId, startDate);
        Long totalClicks = totalClicksRaw != null ? totalClicksRaw : 0L;

        List<ClickDataPoint> clicksByDate = clickEventRepository.countByDateForUrl(urlId, startDate)
                .stream()
                .map(row -> new ClickDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<CountryDataPoint> clicksByCountry = clickEventRepository.countByCountryForUrl(urlId, startDate)
                .stream()
                .map(row -> new CountryDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<DeviceDataPoint> clicksByDevice = clickEventRepository.countByDeviceForUrl(urlId, startDate)
                .stream()
                .map(row -> new DeviceDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<BrowserDataPoint> clicksByBrowser = clickEventRepository.countByBrowserForUrl(urlId, startDate)
                .stream()
                .map(row -> new BrowserDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        return new AnalyticsResponseDto(
                totalClicks,
                clicksByDate,
                clicksByCountry,
                clicksByDevice,
                clicksByBrowser
        );
    }

    public AnalyticsResponseDto getOverallAnalytics(User currentUser, String period) {
        Long userId = currentUser.getId();
        LocalDateTime startDate = getStartDateFromPeriod(period);

        Long totalClicksRaw = clickEventRepository.countTotalOverallClicks(userId, startDate);
        Long totalClicks = totalClicksRaw != null ? totalClicksRaw : 0L;

        List<ClickDataPoint> clicksByDate = clickEventRepository.countOverallClicksByDate(userId, startDate)
                .stream()
                .map(row -> new ClickDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<CountryDataPoint> clicksByCountry = clickEventRepository.countOverallClicksByCountry(userId, startDate)
                .stream()
                .map(row -> new CountryDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<DeviceDataPoint> clicksByDevice = clickEventRepository.countOverallClicksByDevice(userId, startDate)
                .stream()
                .map(row -> new DeviceDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<BrowserDataPoint> clicksByBrowser = clickEventRepository.countOverallClicksByBrowser(userId, startDate)
                .stream()
                .map(row -> new BrowserDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        return new AnalyticsResponseDto(
                totalClicks,
                clicksByDate,
                clicksByCountry,
                clicksByDevice,
                clicksByBrowser
        );
    }

    public AnalyticsResponseDto getFolderAnalytics(Long folderId, User currentUser, String period) {
        var folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found"));

        boolean isRoot = currentUser.getRole() != null && currentUser.getRole() == Role.ROOT;

        if (!isRoot && (folder.getUser() == null || !folder.getUser().getId().equals(currentUser.getId()))) {
            throw new org.springframework.security.access.AccessDeniedException("Access denied");
        }

        Long userId = currentUser.getId();
        LocalDateTime startDate = getStartDateFromPeriod(period);

        Long totalClicksRaw = clickEventRepository.countTotalFolderClicks(folderId, userId, startDate);
        Long totalClicks = totalClicksRaw != null ? totalClicksRaw : 0L;

        List<ClickDataPoint> clicksByDate = clickEventRepository.countFolderClicksByDate(folderId, userId, startDate)
                .stream()
                .map(row -> new ClickDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<CountryDataPoint> clicksByCountry = clickEventRepository.countFolderClicksByCountry(folderId, userId, startDate)
                .stream()
                .map(row -> new CountryDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<DeviceDataPoint> clicksByDevice = clickEventRepository.countFolderClicksByDevice(folderId, userId, startDate)
                .stream()
                .map(row -> new DeviceDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<BrowserDataPoint> clicksByBrowser = clickEventRepository.countFolderClicksByBrowser(folderId, userId, startDate)
                .stream()
                .map(row -> new BrowserDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        return new AnalyticsResponseDto(
                totalClicks,
                clicksByDate,
                clicksByCountry,
                clicksByDevice,
                clicksByBrowser
        );
    }

    /**
     * Records a click event for the given short URL hash asynchronously.
     * <p>
     * Execution flow:
     * <ol>
     *   <li>Resolve the {@code shortUrlHash} to a {@link com.url_shortener.url_shortener.urls.Url} entity.</li>
     *   <li>Parse {@code userAgent} → device, browser, OS via {@link UserAgentParserService}.</li>
     *   <li>Resolve {@code ipAddress} → country, city, region, continent via {@link GeoLocationService}.</li>
     *   <li>Hash the raw IP (SHA-256, first 16 hex chars) for pseudonymized storage.</li>
     *   <li>Build and persist the {@link ClickEvent} entity.</li>
     * </ol>
     *
     * @param shortUrlHash the 8-char CRC32 hash identifying the short URL
     * @param userAgent    raw {@code User-Agent} header value from the HTTP request
     * @param ipAddress    resolved client IP (already checked for {@code X-Forwarded-For})
     */
    @Async("analyticsExecutor")
    public void trackClick(String shortUrlHash, String userAgent, String ipAddress) {
        try {
            // 1. Resolve the URL entity — skip tracking if the URL no longer exists
            var url = urlRepository.findByShortUrl(shortUrlHash);
            if (url == null) {
                log.debug("Analytics skipped: URL not found for hash [{}]", shortUrlHash);
                return;
            }

            // 2. Parse User-Agent (Safe)
            UserAgentParserService.DeviceInfo deviceInfo;
            try {
                deviceInfo = userAgentParserService.parse(userAgent);
            } catch (Exception e) {
                log.warn("Failed to parse User-Agent: {}", e.getMessage());
                deviceInfo = new UserAgentParserService.DeviceInfo("Unknown", "Unknown", "Unknown");
            }

            // 3. GeoIP lookup (Safe)
            GeoLocationService.GeoInfo geoInfo;
            try {
                geoInfo = geoLocationService.lookup(ipAddress);
            } catch (Exception e) {
                log.warn("Failed GeoIP lookup for {}: {}", ipAddress, e.getMessage());
                geoInfo = new GeoLocationService.GeoInfo("Unknown", "Unknown", "Unknown", "Unknown");
            }

            // 4. Pseudonymize IP (SHA-256, first 16 hex chars = 64-bit prefix)
            String hashedIp = hashIp(ipAddress);

            // 5. Build and persist the ClickEvent
            ClickEvent event = ClickEvent.builder()
                    .url(url)
                    .timestamp(LocalDateTime.now())
                    .device(deviceInfo.device())
                    .browser(deviceInfo.browser())
                    .os(deviceInfo.os())
                    .country(geoInfo.country())
                    .city(geoInfo.city())
                    .region(geoInfo.region())
                    .continent(geoInfo.continent())
                    .ipAddress(hashedIp)
                    .build();

            clickEventRepository.save(event);

            // Keep legacy statistic column in sync for any code paths that still read it
            if (url.getStatistic() != null) {
                // Total clicks count should be from all time for legacy statistic column
                url.getStatistic().setAccessedTimes(clickEventRepository.countByUrl_Id(url.getId(), LocalDateTime.of(1970, 1, 1, 0, 0)));
                urlRepository.save(url);
            }

            log.debug("Click tracked: hash=[{}] device=[{}] browser=[{}] country=[{}] thread=[{}]",
                    shortUrlHash, deviceInfo.device(), deviceInfo.browser(),
                    geoInfo.country(), Thread.currentThread().getName());

        } catch (Exception e) {
            // Deliberately catch-all: analytics failures must never propagate
            log.error("Failed to track click for hash [{}]: {}", shortUrlHash, e.getMessage(), e);
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private LocalDateTime getStartDateFromPeriod(String period) {
        if (period == null) return LocalDateTime.of(1970, 1, 1, 0, 0);
        return switch (period) {
            case "24h" -> LocalDateTime.now(java.time.ZoneOffset.UTC).minusDays(1);
            case "7d" -> LocalDateTime.now(java.time.ZoneOffset.UTC).minusDays(7);
            case "30d" -> LocalDateTime.now(java.time.ZoneOffset.UTC).minusDays(30);
            default -> LocalDateTime.of(1970, 1, 1, 0, 0);
        };
    }

    /**
     * Pseudonymizes an IP address using SHA-256, retaining only the first 16
     * hex characters (64 bits). This provides enough entropy for analytics
     * deduplication while being irreversible for privacy compliance.
     *
     * @param ipAddress raw IP address string
     * @return 16-char hex string, or {@code "unknown"} if hashing fails
     */
    private String hashIp(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) return "unknown";
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(ipAddress.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hashBytes) {
                sb.append(String.format("%02x", b));
            }
            // Return first 16 hex chars (= 8 bytes = 64 bits of entropy)
            return sb.substring(0, 16);
        } catch (NoSuchAlgorithmException e) {
            log.warn("SHA-256 not available — storing blank IP hash");
            return "unknown";
        }
    }
}
