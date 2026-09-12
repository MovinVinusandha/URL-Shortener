package com.url_shortener.url_shortener.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.url_shortener.url_shortener.admin.BlacklistedDomain;
import com.url_shortener.url_shortener.admin.BlacklistedDomainRepository;
import com.url_shortener.url_shortener.admin.SystemSettingRepository;
import com.url_shortener.url_shortener.security.dto.ThreatScanResultDto;
import com.url_shortener.url_shortener.urls.Url;
import com.url_shortener.url_shortener.urls.UrlRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.*;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class ThreatScannerService {

    private final BlacklistedDomainRepository blacklistedDomainRepository;
    private final SystemSettingRepository systemSettingRepository;
    private final SecurityIncidentRepository incidentRepository;
    private final UrlRepository urlRepository;
    private final StringRedisTemplate redisTemplate;
    private final CacheManager cacheManager;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.security.safe-browsing-api-key:}")
    private String configuredSafeBrowsingApiKey;

    private static final Set<String> DANGEROUS_EXTENSIONS = Set.of(
            ".exe", ".scr", ".bat", ".cmd", ".vbs", ".vbe", ".js", ".jse",
            ".ps1", ".ps2", ".apk", ".msi", ".jar", ".hta", ".cpl", ".pif",
            ".iso", ".img", ".dmg"
    );

    private static final Set<String> SUSPICIOUS_TLDS = Set.of(
            ".xyz", ".top", ".buzz", ".online", ".club", ".site", ".icu",
            ".tk", ".ml", ".ga", ".cf", ".gq", ".work", ".cam", ".rest"
    );

    private static final List<String> PHISHING_KEYWORDS = List.of(
            "paypal", "appleid", "metamask", "binance", "coinbase", "netflix",
            "bankofamerica", "chase", "wellsfargo", "secure-login", "account-verify",
            "wallet-connect", "password-reset", "verify-account", "recovery-phrase"
    );

    private static final Pattern IPV4_PATTERN = Pattern.compile("^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$");

    /**
     * Synchronous scanner examining both heuristic rules and Google Safe Browsing API (if enabled).
     */
    public ThreatScanResultDto scanUrl(String rawUrl) {
        long startTime = System.currentTimeMillis();
        List<String> threats = new ArrayList<>();
        int riskScore = 0;
        String threatType = "CLEAN";
        String engine = "HEURISTIC";

        if (rawUrl == null || rawUrl.trim().isEmpty()) {
            return ThreatScanResultDto.builder()
                    .safe(false)
                    .riskScore(100)
                    .threatType("MALFORMED_URL")
                    .detectedThreats(List.of("URL is empty or null"))
                    .engine(engine)
                    .scanDurationMs(System.currentTimeMillis() - startTime)
                    .build();
        }

        String target = rawUrl.trim();
        URI uri;
        try {
            uri = new URI(target);
            if (uri.getScheme() == null || (!uri.getScheme().equalsIgnoreCase("http") && !uri.getScheme().equalsIgnoreCase("https"))) {
                threats.add("Unsupported or non-standard protocol: " + uri.getScheme());
                riskScore += 40;
            }
        } catch (Exception e) {
            return ThreatScanResultDto.builder()
                    .safe(false)
                    .riskScore(100)
                    .threatType("MALFORMED_URL")
                    .detectedThreats(List.of("URL could not be parsed: " + e.getMessage()))
                    .engine(engine)
                    .scanDurationMs(System.currentTimeMillis() - startTime)
                    .build();
        }

        String host = uri.getHost() != null ? uri.getHost().toLowerCase() : "";
        String path = uri.getPath() != null ? uri.getPath().toLowerCase() : "";

        // 1. Heuristic: Direct IP host check
        if (IPV4_PATTERN.matcher(host).matches() || host.contains(":")) {
            threats.add("Direct IP address used as host (" + host + "), bypassing standard domain reputation");
            riskScore += 45;
            threatType = "RAW_IP_HOST";
        }

        // 2. Heuristic: Punycode homograph check
        if (host.startsWith("xn--") || host.contains(".xn--")) {
            threats.add("Punycode (xn--) internationalized domain detected; potential homograph spoofing lure");
            riskScore += 35;
            threatType = "HOMOGRAPH_SPOOFING";
        }

        // 3. Heuristic: Excessive subdomain count (cloaking / domain hopping)
        String[] labels = host.split("\\.");
        if (labels.length >= 5) {
            threats.add("Abnormal subdomain depth (" + labels.length + " levels), typical in URL masking");
            riskScore += 25;
        }

        // 4. Heuristic: Credentials in authority
        if (uri.getUserInfo() != null && !uri.getUserInfo().isBlank()) {
            threats.add("Embedded user credentials in authority component: " + uri.getUserInfo());
            riskScore += 50;
            threatType = "CREDENTIAL_EMBEDDED";
        }

        // 5. Heuristic: Dangerous executable or dropper extensions
        for (String ext : DANGEROUS_EXTENSIONS) {
            if (path.endsWith(ext) || path.contains(ext + "/") || path.contains(ext + "?")) {
                threats.add("Executable or script dropper extension detected: " + ext);
                riskScore += 70;
                threatType = "MALWARE_PAYLOAD";
                break;
            }
        }

        // 6. Heuristic: Phishing keywords with suspicious low-reputation TLDs
        boolean hasPhishingKeyword = PHISHING_KEYWORDS.stream().anyMatch(target.toLowerCase()::contains);
        boolean hasSuspiciousTld = SUSPICIOUS_TLDS.stream().anyMatch(host::endsWith);
        if (hasPhishingKeyword && hasSuspiciousTld) {
            threats.add("High-risk brand/credential keyword combined with suspicious low-reputation TLD");
            riskScore += 55;
            threatType = "PHISHING_HEURISTIC";
        }

        // 7. Heuristic: Administrative Domain Blacklist
        List<BlacklistedDomain> blacklisted = blacklistedDomainRepository.findAll();
        for (BlacklistedDomain b : blacklisted) {
            if (matchesDomainPattern(host, b.getDomainPattern())) {
                threats.add("Domain matches administrative blacklist: " + b.getDomainPattern() + " (" + b.getReason() + ")");
                riskScore = 100;
                threatType = "BLACKLISTED_DOMAIN";
                break;
            }
        }

        // 8. Google Safe Browsing API v4 Integration (Optional)
        String safeBrowsingKey = getEffectiveSafeBrowsingKey();
        if (safeBrowsingKey != null && !safeBrowsingKey.isBlank()) {
            engine = "HYBRID";
            try {
                List<String> gsbThreats = queryGoogleSafeBrowsing(target, safeBrowsingKey);
                if (!gsbThreats.isEmpty()) {
                    threats.addAll(gsbThreats);
                    riskScore = 100;
                    threatType = "GOOGLE_SAFE_BROWSING_ALERT";
                }
            } catch (Exception e) {
                log.warn("Google Safe Browsing query failed (falling back to heuristics): {}", e.getMessage());
            }
        }

        boolean isSafe = riskScore < 50 && threats.isEmpty();
        if (isSafe) {
            riskScore = Math.min(riskScore, 15);
            threatType = "CLEAN";
        }

        return ThreatScanResultDto.builder()
                .safe(isSafe)
                .riskScore(Math.min(riskScore, 100))
                .threatType(threatType)
                .detectedThreats(threats)
                .engine(engine)
                .scanDurationMs(System.currentTimeMillis() - startTime)
                .build();
    }

    /**
     * Non-blocking background verification. If a threat is confirmed,
     * automatically quarantines the link and files a security incident.
     */
    @Async("threatScannerExecutor")
    @Transactional
    public void scanAndEnforceAsync(String shortUrl, String longUrl, String userEmail, String clientIp) {
        try {
            ThreatScanResultDto result = scanUrl(longUrl);
            if (!result.isSafe()) {
                log.warn("Automated threat scanner flagged short URL '{}' (target: {}): {}",
                        shortUrl, longUrl, result.getDetectedThreats());

                // 1. Record Security Incident
                SecurityIncident incident = SecurityIncident.builder()
                        .incidentType(result.getThreatType())
                        .severity(result.getRiskScore() >= 80 ? "CRITICAL" : "HIGH")
                        .targetUrl(longUrl)
                        .shortUrl(shortUrl)
                        .clientIp(clientIp)
                        .userEmail(userEmail)
                        .details(String.join("; ", result.getDetectedThreats()) + " (Risk Score: " + result.getRiskScore() + "/100)")
                        .isResolved(false)
                        .build();
                incidentRepository.save(incident);

                // 2. Quarantine the link
                Url url = urlRepository.findByShortUrl(shortUrl);
                if (url != null) {
                    url.setQuarantined(true);
                    url.setQuarantineReason("Auto-quarantined by Proactive Threat Scanner: " + result.getThreatType());
                    url.setActive(false);
                    urlRepository.save(url);

                    // 3. Invalidate Redis & Spring cache immediately
                    evictCache(shortUrl);
                    log.info("Short URL '{}' automatically quarantined and cache evicted.", shortUrl);
                }
            }
        } catch (Exception e) {
            log.error("Error executing async threat scan for '{}': {}", shortUrl, e.getMessage());
        }
    }

    private List<String> queryGoogleSafeBrowsing(String url, String apiKey) {
        String endpoint = "https://safebrowsing.googleapis.com/v4/threatMatches:find?key=" + apiKey;

        Map<String, Object> requestBody = Map.of(
                "client", Map.of("clientId", "trim-url-shortener", "clientVersion", "2.0.0"),
                "threatInfo", Map.of(
                        "threatTypes", List.of("MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"),
                        "platformTypes", List.of("ANY_PLATFORM"),
                        "threatEntryTypes", List.of("URL"),
                        "threatEntries", List.of(Map.of("url", url))
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        List<String> results = new ArrayList<>();
        try {
            ResponseEntity<String> response = restTemplate.postForEntity(endpoint, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode matches = root.path("matches");
                if (matches.isArray() && !matches.isEmpty()) {
                    for (JsonNode match : matches) {
                        String threatType = match.path("threatType").asText("THREAT");
                        String platformType = match.path("platformType").asText("ANY");
                        results.add("Google Safe Browsing Match: " + threatType + " on " + platformType);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("GSB API call failed: {}", e.getMessage());
        }

        return results;
    }

    private String getEffectiveSafeBrowsingKey() {
        try {
            var setting = systemSettingRepository.findBySettingKey("SAFE_BROWSING_API_KEY");
            if (setting.isPresent() && !setting.get().getSettingValue().isBlank()) {
                return setting.get().getSettingValue().trim();
            }
        } catch (Exception ignored) {}
        return configuredSafeBrowsingApiKey != null ? configuredSafeBrowsingApiKey.trim() : "";
    }

    private boolean matchesDomainPattern(String host, String pattern) {
        if (pattern == null || host == null) return false;
        String cleanPattern = pattern.trim().toLowerCase();
        if (cleanPattern.startsWith("*.")) {
            String suffix = cleanPattern.substring(2);
            return host.equals(suffix) || host.endsWith("." + suffix);
        }
        return host.equalsIgnoreCase(cleanPattern);
    }

    private void evictCache(String shortUrl) {
        try {
            redisTemplate.delete("urls::" + shortUrl);
            Cache cache = cacheManager.getCache("urls");
            if (cache != null) {
                cache.evict(shortUrl);
            }
        } catch (Exception e) {
            log.warn("Failed to evict cache for {}: {}", shortUrl, e.getMessage());
        }
    }
}
