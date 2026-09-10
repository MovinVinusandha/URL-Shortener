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
import java.util.Map;
import java.util.stream.Collectors;

import com.url_shortener.url_shortener.analytics.dto.AnalyticsResponseDto;
import com.url_shortener.url_shortener.analytics.dto.ClickDataPoint;
import com.url_shortener.url_shortener.analytics.dto.CountryDataPoint;
import com.url_shortener.url_shortener.analytics.dto.DeviceDataPoint;
import com.url_shortener.url_shortener.analytics.dto.BrowserDataPoint;
import com.url_shortener.url_shortener.analytics.dto.UtmDataPoint;
import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.Role;

/**
 * Asynchronous analytics orchestrator that records a {@link ClickEvent}
 * for every short URL access.
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
    private final EventStreamService       eventStreamService;

    public UserUsageStatsDto getUserUsageStats(User currentUser) {
        long totalLinks = urlRepository.countByUserId(currentUser.getId());
        long totalClicks = clickEventRepository.countTotalClicksByUserId(currentUser.getId());
        return UserUsageStatsDto.builder()
                .totalLinks(totalLinks)
                .totalClicks(totalClicks)
                .build();
    }

    public AnalyticsResponseDto getAnalytics(String hash, User currentUser, String period, String startDateStr, String endDateStr, String utmSource, String utmMedium, String utmCampaign, String utmTerm, String utmContent, String referer) {
        var url = urlRepository.findByShortUrl(hash);
        if (url == null) {
            throw new com.url_shortener.url_shortener.urls.UrlNotFoundException();
        }

        boolean isRoot = currentUser.getRole() != null && currentUser.getRole() == Role.ROOT;

        if (!isRoot && (url.getUser() == null || !url.getUser().getId().equals(currentUser.getId()))) {
            throw new com.url_shortener.url_shortener.urls.UrlNotFoundException();
        }

        Long urlId = url.getId();
        DateRange dates = parseDates(startDateStr, endDateStr, period);
        LocalDateTime startDate = dates.start();
        LocalDateTime endDate = dates.end();

        Long totalClicksRaw = clickEventRepository.countByUrl_Id(urlId, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer);
        Long totalClicks = totalClicksRaw != null ? totalClicksRaw : 0L;

        List<ClickDataPoint> clicksByDate;
        if (isHourlyGranularity(period, startDate, endDate)) {
            List<ClickDataPoint> rawClicksByDate = clickEventRepository.countByHourForUrl(urlId, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer)
                    .stream()
                    .map(row -> new ClickDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                    .collect(Collectors.toList());
            clicksByDate = fillMissingHours(rawClicksByDate, startDate, endDate);
        } else {
            List<ClickDataPoint> rawClicksByDate = clickEventRepository.countByDateForUrl(urlId, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer)
                    .stream()
                    .map(row -> new ClickDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                    .collect(Collectors.toList());
            clicksByDate = fillMissingDates(rawClicksByDate, startDate, endDate);
        }

        List<CountryDataPoint> clicksByCountry = clickEventRepository.countByCountryForUrl(urlId, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer)
                .stream()
                .map(row -> new CountryDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<DeviceDataPoint> clicksByDevice = clickEventRepository.countByDeviceForUrl(urlId, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer)
                .stream()
                .map(row -> new DeviceDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<BrowserDataPoint> clicksByBrowser = clickEventRepository.countByBrowserForUrl(urlId, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer)
                .stream()
                .map(row -> new BrowserDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<UtmDataPoint> clicksByUtmSource = mapToUtmDataPoints(clickEventRepository.countByUtmSourceForUrl(urlId, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer));
        List<UtmDataPoint> clicksByUtmMedium = mapToUtmDataPoints(clickEventRepository.countByUtmMediumForUrl(urlId, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer));
        List<UtmDataPoint> clicksByUtmCampaign = mapToUtmDataPoints(clickEventRepository.countByUtmCampaignForUrl(urlId, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer));
        List<UtmDataPoint> clicksByUtmTerm = mapToUtmDataPoints(clickEventRepository.countByUtmTermForUrl(urlId, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer));
        List<UtmDataPoint> clicksByUtmContent = mapToUtmDataPoints(clickEventRepository.countByUtmContentForUrl(urlId, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer));
        List<UtmDataPoint> clicksByReferer = mapToUtmDataPoints(clickEventRepository.countByRefererForUrl(urlId, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer));

        return AnalyticsResponseDto.builder()
                .totalClicks(totalClicks)
                .clicksByDate(clicksByDate)
                .clicksByCountry(clicksByCountry)
                .clicksByDevice(clicksByDevice)
                .clicksByBrowser(clicksByBrowser)
                .clicksByUtmSource(clicksByUtmSource)
                .clicksByUtmMedium(clicksByUtmMedium)
                .clicksByUtmCampaign(clicksByUtmCampaign)
                .clicksByUtmTerm(clicksByUtmTerm)
                .clicksByUtmContent(clicksByUtmContent)
                .clicksByReferer(clicksByReferer)
                .build();
    }

    public AnalyticsResponseDto getOverallAnalytics(User currentUser, String period, String startDateStr, String endDateStr, String hash, List<Long> tagIds, Long folderId, String utmSource, String utmMedium, String utmCampaign, String utmTerm, String utmContent, String referer) {
        tagIds = tagIds == null ? null : tagIds.stream().filter(id -> id != null && id > 0).collect(Collectors.toList());
        if (tagIds != null && tagIds.isEmpty()) {
            tagIds = null;
        }

        Long userId = currentUser.getId();
        DateRange dates = parseDates(startDateStr, endDateStr, period);
        LocalDateTime startDate = dates.start();
        LocalDateTime endDate = dates.end();

        Long totalClicksRaw = clickEventRepository.countTotalOverallClicks(userId, startDate, endDate, hash, tagIds, folderId, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer);
        Long totalClicks = totalClicksRaw != null ? totalClicksRaw : 0L;

        List<ClickDataPoint> clicksByDate;
        if (isHourlyGranularity(period, startDate, endDate)) {
            List<ClickDataPoint> rawClicksByDate = clickEventRepository.countOverallClicksByHour(userId, startDate, endDate, hash, tagIds, folderId, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer)
                    .stream()
                    .map(row -> new ClickDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                    .collect(Collectors.toList());
            clicksByDate = fillMissingHours(rawClicksByDate, startDate, endDate);
        } else {
            List<ClickDataPoint> rawClicksByDate = clickEventRepository.countOverallClicksByDate(userId, startDate, endDate, hash, tagIds, folderId, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer)
                    .stream()
                    .map(row -> new ClickDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                    .collect(Collectors.toList());
            clicksByDate = fillMissingDates(rawClicksByDate, startDate, endDate);
        }

        List<CountryDataPoint> clicksByCountry = clickEventRepository.countOverallClicksByCountry(userId, startDate, endDate, hash, tagIds, folderId, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer)
                .stream()
                .map(row -> new CountryDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<DeviceDataPoint> clicksByDevice = clickEventRepository.countOverallClicksByDevice(userId, startDate, endDate, hash, tagIds, folderId, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer)
                .stream()
                .map(row -> new DeviceDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<BrowserDataPoint> clicksByBrowser = clickEventRepository.countOverallClicksByBrowser(userId, startDate, endDate, hash, tagIds, folderId, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer)
                .stream()
                .map(row -> new BrowserDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<UtmDataPoint> clicksByUtmSource = mapToUtmDataPoints(clickEventRepository.countOverallClicksByUtmSource(userId, startDate, endDate, hash, tagIds, folderId, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer));
        List<UtmDataPoint> clicksByUtmMedium = mapToUtmDataPoints(clickEventRepository.countOverallClicksByUtmMedium(userId, startDate, endDate, hash, tagIds, folderId, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer));
        List<UtmDataPoint> clicksByUtmCampaign = mapToUtmDataPoints(clickEventRepository.countOverallClicksByUtmCampaign(userId, startDate, endDate, hash, tagIds, folderId, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer));
        List<UtmDataPoint> clicksByUtmTerm = mapToUtmDataPoints(clickEventRepository.countOverallClicksByUtmTerm(userId, startDate, endDate, hash, tagIds, folderId, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer));
        List<UtmDataPoint> clicksByUtmContent = mapToUtmDataPoints(clickEventRepository.countOverallClicksByUtmContent(userId, startDate, endDate, hash, tagIds, folderId, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer));
        List<UtmDataPoint> clicksByReferer = mapToUtmDataPoints(clickEventRepository.countOverallClicksByReferer(userId, startDate, endDate, hash, tagIds, folderId, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer));

        return AnalyticsResponseDto.builder()
                .totalClicks(totalClicks)
                .clicksByDate(clicksByDate)
                .clicksByCountry(clicksByCountry)
                .clicksByDevice(clicksByDevice)
                .clicksByBrowser(clicksByBrowser)
                .clicksByUtmSource(clicksByUtmSource)
                .clicksByUtmMedium(clicksByUtmMedium)
                .clicksByUtmCampaign(clicksByUtmCampaign)
                .clicksByUtmTerm(clicksByUtmTerm)
                .clicksByUtmContent(clicksByUtmContent)
                .clicksByReferer(clicksByReferer)
                .build();
    }

    public AnalyticsResponseDto getFolderAnalyticsBySlug(String slug, User currentUser, String period, String startDateStr, String endDateStr, String utmSource, String utmMedium, String utmCampaign, String utmTerm, String utmContent, String referer) {
        var folder = folderRepository.findByUserIdAndSlug(currentUser.getId(), slug)
                .orElseThrow(() -> new RuntimeException("Folder not found"));
        return getFolderAnalytics(folder.getId(), currentUser, period, startDateStr, endDateStr, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer);
    }

    public AnalyticsResponseDto getFolderAnalytics(Long folderId, User currentUser, String period, String startDateStr, String endDateStr, String utmSource, String utmMedium, String utmCampaign, String utmTerm, String utmContent, String referer) {
        var folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found"));

        boolean isRoot = currentUser.getRole() != null && currentUser.getRole() == Role.ROOT;

        if (!isRoot && (folder.getUser() == null || !folder.getUser().getId().equals(currentUser.getId()))) {
            throw new org.springframework.security.access.AccessDeniedException("Access denied");
        }

        Long userId = currentUser.getId();
        DateRange dates = parseDates(startDateStr, endDateStr, period);
        LocalDateTime startDate = dates.start();
        LocalDateTime endDate = dates.end();

        Long totalClicksRaw = clickEventRepository.countTotalFolderClicks(folderId, userId, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer);
        Long totalClicks = totalClicksRaw != null ? totalClicksRaw : 0L;

        List<ClickDataPoint> clicksByDate;
        if (isHourlyGranularity(period, startDate, endDate)) {
            List<ClickDataPoint> rawClicksByDate = clickEventRepository.countFolderClicksByHour(folderId, userId, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer)
                    .stream()
                    .map(row -> new ClickDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                    .collect(Collectors.toList());
            clicksByDate = fillMissingHours(rawClicksByDate, startDate, endDate);
        } else {
            List<ClickDataPoint> rawClicksByDate = clickEventRepository.countFolderClicksByDate(folderId, userId, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer)
                    .stream()
                    .map(row -> new ClickDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                    .collect(Collectors.toList());
            clicksByDate = fillMissingDates(rawClicksByDate, startDate, endDate);
        }

        List<CountryDataPoint> clicksByCountry = clickEventRepository.countFolderClicksByCountry(folderId, userId, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer)
                .stream()
                .map(row -> new CountryDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<DeviceDataPoint> clicksByDevice = clickEventRepository.countFolderClicksByDevice(folderId, userId, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer)
                .stream()
                .map(row -> new DeviceDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<BrowserDataPoint> clicksByBrowser = clickEventRepository.countFolderClicksByBrowser(folderId, userId, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer)
                .stream()
                .map(row -> new BrowserDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());

        List<UtmDataPoint> clicksByUtmSource = mapToUtmDataPoints(clickEventRepository.countFolderClicksByUtmSource(folderId, userId, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer));
        List<UtmDataPoint> clicksByUtmMedium = mapToUtmDataPoints(clickEventRepository.countFolderClicksByUtmMedium(folderId, userId, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer));
        List<UtmDataPoint> clicksByUtmCampaign = mapToUtmDataPoints(clickEventRepository.countFolderClicksByUtmCampaign(folderId, userId, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer));
        List<UtmDataPoint> clicksByUtmTerm = mapToUtmDataPoints(clickEventRepository.countFolderClicksByUtmTerm(folderId, userId, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer));
        List<UtmDataPoint> clicksByUtmContent = mapToUtmDataPoints(clickEventRepository.countFolderClicksByUtmContent(folderId, userId, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer));
        List<UtmDataPoint> clicksByReferer = mapToUtmDataPoints(clickEventRepository.countFolderClicksByReferer(folderId, userId, startDate, endDate, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer));

        return AnalyticsResponseDto.builder()
                .totalClicks(totalClicks)
                .clicksByDate(clicksByDate)
                .clicksByCountry(clicksByCountry)
                .clicksByDevice(clicksByDevice)
                .clicksByBrowser(clicksByBrowser)
                .clicksByUtmSource(clicksByUtmSource)
                .clicksByUtmMedium(clicksByUtmMedium)
                .clicksByUtmCampaign(clicksByUtmCampaign)
                .clicksByUtmTerm(clicksByUtmTerm)
                .clicksByUtmContent(clicksByUtmContent)
                .clicksByReferer(clicksByReferer)
                .build();
    }

    private List<UtmDataPoint> mapToUtmDataPoints(List<Object[]> rawList) {
        if (rawList == null) return List.of();
        return rawList.stream()
                .filter(row -> row != null && row.length >= 2 && row[0] != null && !row[0].toString().isBlank())
                .map(row -> new UtmDataPoint(row[0].toString(), ((Number) row[1]).longValue()))
                .collect(Collectors.toList());
    }

    @Async("analyticsExecutor")
    public void trackClick(String shortUrlHash, String userAgent, String ipAddress) {
        trackClick(shortUrlHash, userAgent, ipAddress, null, null);
    }

    @Async("analyticsExecutor")
    public void trackClick(String shortUrlHash, String userAgent, String ipAddress, String referer, Map<String, String> queryParams) {
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
                geoInfo = GeoLocationService.GeoInfo.unknown();
            }

            // 4. Extract UTM Parameters & Referrer
            String longUrl = url.getLongUrl();
            String utmSource = extractParam(longUrl, queryParams, "utm_source");
            String utmMedium = extractParam(longUrl, queryParams, "utm_medium");
            String utmCampaign = extractParam(longUrl, queryParams, "utm_campaign");
            String utmTerm = extractParam(longUrl, queryParams, "utm_term");
            String utmContent = extractParam(longUrl, queryParams, "utm_content");

            String resolvedReferer = (referer != null && !referer.isBlank()) 
                    ? cleanReferer(referer) 
                    : extractParam(longUrl, queryParams, "ref");

            // 5. Pseudonymize IP (SHA-256, first 16 hex chars = 64-bit prefix)
            String hashedIp = hashIp(ipAddress);

            // 6. Build and persist the ClickEvent
            ClickEvent event = ClickEvent.builder()
                    .url(url)
                    .timestamp(LocalDateTime.now(java.time.ZoneOffset.UTC))
                    .device(deviceInfo.device())
                    .browser(deviceInfo.browser())
                    .os(deviceInfo.os())
                    .country(geoInfo.country())
                    .city(geoInfo.city())
                    .region(geoInfo.region())
                    .continent(geoInfo.continent())
                    .latitude(geoInfo.latitude())
                    .longitude(geoInfo.longitude())
                    .utmSource(utmSource)
                    .utmMedium(utmMedium)
                    .utmCampaign(utmCampaign)
                    .utmTerm(utmTerm)
                    .utmContent(utmContent)
                    .referer(resolvedReferer)
                    .ipAddress(hashedIp)
                    .build();

            ClickEvent savedEvent = clickEventRepository.save(event);

            // Broadcast to real-time subscribers if the URL has an owner
            if (url.getUser() != null) {
                com.url_shortener.url_shortener.analytics.dto.ClickEventDto eventDto = com.url_shortener.url_shortener.analytics.dto.ClickEventDto.builder()
                        .id(savedEvent.getId())
                        .urlId(url.getId())
                        .shortUrlHash(url.getShortUrl())
                        .originalUrl(url.getLongUrl())
                        .timestamp(savedEvent.getTimestamp())
                        .device(savedEvent.getDevice())
                        .browser(savedEvent.getBrowser())
                        .os(savedEvent.getOs())
                        .country(savedEvent.getCountry())
                        .city(savedEvent.getCity())
                        .region(savedEvent.getRegion())
                        .continent(savedEvent.getContinent())
                        .latitude(savedEvent.getLatitude())
                        .longitude(savedEvent.getLongitude())
                        .utmSource(savedEvent.getUtmSource())
                        .utmMedium(savedEvent.getUtmMedium())
                        .utmCampaign(savedEvent.getUtmCampaign())
                        .utmTerm(savedEvent.getUtmTerm())
                        .utmContent(savedEvent.getUtmContent())
                        .referer(savedEvent.getReferer())
                        .ipAddress(savedEvent.getIpAddress())
                        .build();
                eventStreamService.broadcastEvent(url.getUser().getId(), eventDto);
            }

            // Keep legacy statistic column in sync for any code paths that still read it
            if (url.getStatistic() != null) {
                url.getStatistic().setAccessedTimes(clickEventRepository.countByUrl_Id(url.getId(), LocalDateTime.of(1970, 1, 1, 0, 0), null));
                urlRepository.save(url);
            }

            log.debug("Click tracked: hash=[{}] device=[{}] browser=[{}] country=[{}] utm_source=[{}]",
                    shortUrlHash, deviceInfo.device(), deviceInfo.browser(), geoInfo.country(), utmSource);

        } catch (Exception e) {
            log.error("Failed to track click for hash [{}]: {}", shortUrlHash, e.getMessage(), e);
        }
    }

    private String cleanReferer(String ref) {
        if (ref == null || ref.isBlank()) return null;
        try {
            java.net.URI uri = java.net.URI.create(ref.trim());
            if (uri.getHost() != null) {
                return uri.getHost();
            }
        } catch (Exception ignored) {}
        return ref.trim().length() > 255 ? ref.trim().substring(0, 255) : ref.trim();
    }

    private String extractParam(String longUrl, Map<String, String> queryParams, String key) {
        if (queryParams != null && queryParams.containsKey(key)) {
            String val = queryParams.get(key);
            if (val != null && !val.isBlank()) {
                return val.trim().length() > 150 ? val.trim().substring(0, 150) : val.trim();
            }
        }
        if (longUrl != null && longUrl.contains("?")) {
            try {
                String query = longUrl.substring(longUrl.indexOf('?') + 1);
                for (String pair : query.split("&")) {
                    int idx = pair.indexOf('=');
                    if (idx > 0) {
                        String k = java.net.URLDecoder.decode(pair.substring(0, idx), StandardCharsets.UTF_8);
                        if (k.equalsIgnoreCase(key)) {
                            String v = java.net.URLDecoder.decode(pair.substring(idx + 1), StandardCharsets.UTF_8).trim();
                            return v.length() > 150 ? v.substring(0, 150) : v;
                        }
                    }
                }
            } catch (Exception ignored) {}
        }
        return null;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private boolean isHourlyGranularity(String period, LocalDateTime startDate, LocalDateTime endDate) {
        if ("24h".equalsIgnoreCase(period)) {
            return true;
        }
        if (startDate != null && !startDate.equals(LocalDateTime.of(1970, 1, 1, 0, 0))) {
            LocalDateTime effectiveEnd = endDate != null ? endDate : LocalDateTime.now(java.time.ZoneOffset.UTC);
            java.time.Duration duration = java.time.Duration.between(startDate, effectiveEnd);
            return !duration.isNegative() && duration.toHours() <= 24;
        }
        return false;
    }

    private List<ClickDataPoint> fillMissingHours(List<ClickDataPoint> rawData, LocalDateTime startDate, LocalDateTime endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            return rawData;
        }
        LocalDateTime effectiveStart;
        if (startDate == null || startDate.equals(LocalDateTime.of(1970, 1, 1, 0, 0))) {
            if (rawData.isEmpty()) {
                effectiveStart = LocalDateTime.now(java.time.ZoneOffset.UTC).minusHours(24);
            } else {
                try {
                    String d = rawData.get(0).getDate().replace(" ", "T");
                    effectiveStart = LocalDateTime.parse(d);
                } catch (Exception e) {
                    effectiveStart = LocalDateTime.now(java.time.ZoneOffset.UTC).minusHours(24);
                }
            }
        } else {
            effectiveStart = startDate;
        }
        effectiveStart = effectiveStart.truncatedTo(java.time.temporal.ChronoUnit.HOURS);

        LocalDateTime effectiveEnd;
        if (endDate == null) {
            effectiveEnd = LocalDateTime.now(java.time.ZoneOffset.UTC);
        } else {
            effectiveEnd = endDate;
        }
        effectiveEnd = effectiveEnd.truncatedTo(java.time.temporal.ChronoUnit.HOURS);

        Map<String, Long> countMap = rawData.stream()
                .collect(Collectors.toMap(ClickDataPoint::getDate, ClickDataPoint::getCount, (v1, v2) -> v1));

        List<ClickDataPoint> result = new java.util.ArrayList<>();
        LocalDateTime current = effectiveStart;

        while (!current.isAfter(effectiveEnd)) {
            String hourKey = String.format("%04d-%02d-%02d %02d:00:00",
                    current.getYear(),
                    current.getMonthValue(),
                    current.getDayOfMonth(),
                    current.getHour());

            long count = countMap.getOrDefault(hourKey, 0L);
            result.add(new ClickDataPoint(hourKey, count));
            current = current.plusHours(1);
        }

        return result;
    }

    private List<ClickDataPoint> fillMissingDates(List<ClickDataPoint> rawData, LocalDateTime startDate, LocalDateTime endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            return rawData;
        }
        LocalDateTime effectiveStart;
        if (startDate == null || startDate.equals(LocalDateTime.of(1970, 1, 1, 0, 0))) {
            if (rawData.isEmpty()) {
                effectiveStart = LocalDateTime.now(java.time.ZoneOffset.UTC).minusDays(30);
            } else {
                try {
                    effectiveStart = java.time.LocalDate.parse(rawData.get(0).getDate()).atStartOfDay();
                } catch (Exception e) {
                    effectiveStart = LocalDateTime.now(java.time.ZoneOffset.UTC).minusDays(30);
                }
            }
        } else {
            effectiveStart = startDate;
        }

        LocalDateTime effectiveEnd;
        if (endDate == null) {
            effectiveEnd = LocalDateTime.now(java.time.ZoneOffset.UTC);
        } else {
            effectiveEnd = endDate;
        }

        Map<String, Long> countMap = rawData.stream()
                .collect(Collectors.toMap(ClickDataPoint::getDate, ClickDataPoint::getCount, (v1, v2) -> v1));

        List<ClickDataPoint> result = new java.util.ArrayList<>();
        LocalDateTime current = effectiveStart;

        while (!current.toLocalDate().isAfter(effectiveEnd.toLocalDate())) {
            String dateKey = current.toLocalDate().toString();
            long count = countMap.getOrDefault(dateKey, 0L);
            result.add(new ClickDataPoint(dateKey, count));
            current = current.plusDays(1);
        }

        return result;
    }

    private DateRange parseDates(String startDateStr, String endDateStr, String period) {
        LocalDateTime now = LocalDateTime.now(java.time.ZoneOffset.UTC);
        LocalDateTime liveBufferEnd = now.plusMinutes(15);

        if (startDateStr != null && !startDateStr.isBlank()) {
            LocalDateTime start = parseIsoDateTime(startDateStr, true);
            LocalDateTime end = (endDateStr != null && !endDateStr.isBlank())
                    ? parseIsoDateTime(endDateStr, false)
                    : liveBufferEnd;
            return new DateRange(start, end);
        }

        if (period != null) {
            return switch (period.toLowerCase()) {
                case "24h" -> new DateRange(now.minusHours(24), liveBufferEnd);
                case "7d"  -> new DateRange(now.minusDays(7),  liveBufferEnd);
                case "30d" -> new DateRange(now.minusDays(30), liveBufferEnd);
                case "90d" -> new DateRange(now.minusDays(90), liveBufferEnd);
                case "all" -> new DateRange(LocalDateTime.of(1970, 1, 1, 0, 0), liveBufferEnd);
                default    -> new DateRange(now.minusDays(30), liveBufferEnd);
            };
        }

        return new DateRange(now.minusDays(30), liveBufferEnd);
    }

    private LocalDateTime parseIsoDateTime(String str, boolean isStart) {
        try {
            if (str.contains("T")) {
                return LocalDateTime.parse(str);
            }
            java.time.LocalDate date = java.time.LocalDate.parse(str);
            return isStart ? date.atStartOfDay() : date.atTime(23, 59, 59, 999999999);
        } catch (Exception e) {
            log.warn("Could not parse date string '{}', using fallback", str);
            return isStart ? LocalDateTime.of(1970, 1, 1, 0, 0) : LocalDateTime.now(java.time.ZoneOffset.UTC);
        }
    }

    private String hashIp(String ip) {
        if (ip == null || ip.isBlank() || "Unknown".equalsIgnoreCase(ip)) {
            return "0000000000000000";
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(ip.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 8; i++) {
                sb.append(String.format("%02x", hash[i]));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            return "0000000000000000";
        }
    }

    public org.springframework.data.domain.Page<com.url_shortener.url_shortener.analytics.dto.ClickEventDto> getPaginatedEvents(
            User currentUser,
            String period,
            String startDateStr,
            String endDateStr,
            String hash,
            String country,
            String city,
            String device,
            String browser,
            String os,
            String campaign,
            String search,
            org.springframework.data.domain.Pageable pageable
    ) {
        DateRange dates = parseDates(startDateStr, endDateStr, period);
        LocalDateTime startDate = dates.start();
        LocalDateTime endDate = dates.end();

        return clickEventRepository.findEventsForUser(
                currentUser.getId(),
                (hash != null && !hash.isBlank()) ? hash : null,
                (country != null && !country.isBlank()) ? country : null,
                (city != null && !city.isBlank()) ? city : null,
                (device != null && !device.isBlank()) ? device : null,
                (browser != null && !browser.isBlank()) ? browser : null,
                (os != null && !os.isBlank()) ? os : null,
                (campaign != null && !campaign.isBlank()) ? campaign : null,
                (search != null && !search.isBlank()) ? search.trim() : null,
                startDate,
                endDate,
                pageable
        ).map(event -> com.url_shortener.url_shortener.analytics.dto.ClickEventDto.builder()
                .id(event.getId())
                .urlId(event.getUrl().getId())
                .shortUrlHash(event.getUrl().getShortUrl())
                .originalUrl(event.getUrl().getLongUrl())
                .timestamp(event.getTimestamp())
                .device(event.getDevice())
                .browser(event.getBrowser())
                .os(event.getOs())
                .country(event.getCountry())
                .city(event.getCity())
                .region(event.getRegion())
                .continent(event.getContinent())
                .latitude(event.getLatitude())
                .longitude(event.getLongitude())
                .utmSource(event.getUtmSource())
                .utmMedium(event.getUtmMedium())
                .utmCampaign(event.getUtmCampaign())
                .utmTerm(event.getUtmTerm())
                .utmContent(event.getUtmContent())
                .referer(event.getReferer())
                .ipAddress(event.getIpAddress())
                .build()
        );
    }

    public record DateRange(LocalDateTime start, LocalDateTime end) {}
}
