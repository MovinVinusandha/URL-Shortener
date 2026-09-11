package com.url_shortener.url_shortener.admin;

import com.url_shortener.url_shortener.admin.dto.*;
import com.url_shortener.url_shortener.analytics.ClickEventRepository;
import com.url_shortener.url_shortener.auth.TokenRevocationService;
import com.url_shortener.url_shortener.urls.Url;
import com.url_shortener.url_shortener.urls.UrlRepository;
import com.url_shortener.url_shortener.users.Role;
import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final UrlRepository urlRepository;
    private final UserRepository userRepository;
    private final ClickEventRepository clickEventRepository;
    private final BlacklistedDomainRepository blacklistedDomainRepository;
    private final SystemSettingRepository systemSettingRepository;
    private final TokenRevocationService tokenRevocationService;
    private final StringRedisTemplate redisTemplate;
    private final CacheManager cacheManager;

    @Value("${app.domain.root}")
    private String rootDomainUrl;

    public AdminOverviewDto getOverviewStats() {
        long totalLinks = urlRepository.count();
        long activeLinks = urlRepository.countByIsActiveTrueAndIsQuarantinedFalse();
        long expiredLinks = urlRepository.countByIsActiveFalse();
        long quarantinedLinks = urlRepository.countByIsQuarantinedTrue();

        long totalClicks = 0;
        try {
            Long clickCount = clickEventRepository.count();
            totalClicks = clickCount != null ? clickCount : 0;
        } catch (Exception e) {
            log.warn("Failed to count click events: {}", e.getMessage());
        }

        LocalDateTime past24h = LocalDateTime.now().minusHours(24);
        long clicksLast24Hours = 0;
        try {
            clicksLast24Hours = clickEventRepository.countByTimestampAfter(past24h);
        } catch (Exception e) {
            log.warn("Failed to count 24h click events: {}", e.getMessage());
        }

        long totalUsers = userRepository.count();
        long suspendedUsers = userRepository.countByIsSuspendedTrue();
        long activeUsers = userRepository.countByIsSuspendedFalse();

        // System Health
        String redisStatus = "HEALTHY";
        String redisMemory = "Normal";
        try {
            RedisConnection connection = Objects.requireNonNull(redisTemplate.getConnectionFactory()).getConnection();
            String pong = connection.ping();
            if (!"PONG".equalsIgnoreCase(pong)) {
                redisStatus = "DEGRADED";
            }
            Properties info = connection.serverCommands().info("memory");
            if (info != null && info.containsKey("used_memory_human")) {
                redisMemory = info.getProperty("used_memory_human");
            }
            connection.close();
        } catch (Exception e) {
            redisStatus = "UNREACHABLE";
            redisMemory = "Unknown";
        }

        // Top Target Domains
        List<Url> sampleUrls = urlRepository.findAll();
        Map<String, Long> domainCounts = new HashMap<>();
        for (Url u : sampleUrls) {
            if (u.getLongUrl() != null) {
                try {
                    URI uri = new URI(u.getLongUrl());
                    String host = uri.getHost();
                    if (host != null && !host.isBlank()) {
                        host = host.toLowerCase().replaceFirst("^www\\.", "");
                        domainCounts.put(host, domainCounts.getOrDefault(host, 0L) + 1);
                    }
                } catch (Exception ignored) {}
            }
        }

        List<AdminOverviewDto.TopDomainDto> topDomains = domainCounts.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(10)
                .map(e -> new AdminOverviewDto.TopDomainDto(e.getKey(), e.getValue()))
                .collect(Collectors.toList());

        AdminOverviewDto.SystemHealthDto health = AdminOverviewDto.SystemHealthDto.builder()
                .redisStatus(redisStatus)
                .redisMemory(redisMemory)
                .sweeperStatus("RUNNING")
                .lastSweeperRun(LocalDateTime.now().toString())
                .activeWorkerThreads(4)
                .build();

        return AdminOverviewDto.builder()
                .totalLinks(totalLinks)
                .activeLinks(activeLinks)
                .expiredLinks(expiredLinks)
                .quarantinedLinks(quarantinedLinks)
                .totalClicks(totalClicks)
                .clicksLast24Hours(clicksLast24Hours)
                .totalUsers(totalUsers)
                .activeUsers(activeUsers)
                .suspendedUsers(suspendedUsers)
                .systemHealth(health)
                .topDomains(topDomains)
                .build();
    }

    public Page<AdminLinkDto> getLinks(int page, int size, String search, String status) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Url> urlPage;

        if (search != null && !search.trim().isEmpty()) {
            String q = search.trim();
            urlPage = urlRepository.findByShortUrlContainingIgnoreCaseOrLongUrlContainingIgnoreCase(q, q, pageable);
        } else {
            urlPage = urlRepository.findAll(pageable);
        }

        return urlPage.map(this::toAdminLinkDto);
    }

    @Transactional
    public AdminLinkDto quarantineLink(String hash, String reason) {
        Url url = urlRepository.findByShortUrl(hash);
        if (url == null) {
            throw new IllegalArgumentException("Short link not found: " + hash);
        }

        url.setQuarantined(true);
        url.setQuarantineReason(reason != null ? reason.trim() : "Flagged for security policy violation");
        url.setActive(false);
        url = urlRepository.save(url);

        // Invalidate Redis cache
        evictCache(url.getShortUrl());

        return toAdminLinkDto(url);
    }

    @Transactional
    public AdminLinkDto unquarantineLink(String hash) {
        Url url = urlRepository.findByShortUrl(hash);
        if (url == null) {
            throw new IllegalArgumentException("Short link not found: " + hash);
        }

        url.setQuarantined(false);
        url.setQuarantineReason(null);
        if (url.getExpiresAt() == null || url.getExpiresAt().isAfter(LocalDateTime.now())) {
            url.setActive(true);
        }
        url = urlRepository.save(url);

        evictCache(url.getShortUrl());

        return toAdminLinkDto(url);
    }

    @Transactional
    public void deleteLink(String hash) {
        Url url = urlRepository.findByShortUrl(hash);
        if (url == null) {
            throw new IllegalArgumentException("Short link not found: " + hash);
        }
        evictCache(url.getShortUrl());
        urlRepository.delete(url);
    }

    public Page<AdminUserDto> getUsers(int page, int size, String search) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<User> userPage;

        if (search != null && !search.trim().isEmpty()) {
            String q = search.trim();
            userPage = userRepository.findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCase(q, q, pageable);
        } else {
            userPage = userRepository.findAll(pageable);
        }

        return userPage.map(this::toAdminUserDto);
    }

    @Transactional
    public AdminUserDto toggleUserSuspension(String publicId, String reason, Long currentAdminId) {
        User user = userRepository.findByPublicId(publicId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + publicId));

        if (user.getId().equals(currentAdminId)) {
            throw new IllegalArgumentException("You cannot suspend your own account.");
        }
        if (user.getRole() == Role.ROOT) {
            throw new IllegalArgumentException("The ROOT instance owner cannot be suspended.");
        }

        boolean willSuspend = !user.isSuspended();
        user.setSuspended(willSuspend);
        user.setSuspendedReason(willSuspend ? (reason != null ? reason.trim() : "Suspended by administrator") : null);
        user = userRepository.save(user);

        if (willSuspend) {
            tokenRevocationService.revokeAllUserTokens(user.getId());
        }

        return toAdminUserDto(user);
    }

    @Transactional
    public AdminUserDto updateUserRole(String publicId, Role newRole, Long currentAdminId) {
        User user = userRepository.findByPublicId(publicId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + publicId));

        if (user.getId().equals(currentAdminId)) {
            throw new IllegalArgumentException("You cannot change your own role.");
        }
        if (user.getRole() == Role.ROOT) {
            throw new IllegalArgumentException("The ROOT instance owner role cannot be modified.");
        }
        if (newRole == Role.ROOT) {
            throw new IllegalArgumentException("Cannot assign ROOT role.");
        }

        user.setRole(newRole);
        user = userRepository.save(user);

        return toAdminUserDto(user);
    }

    public List<BlacklistedDomain> getBlacklist() {
        return blacklistedDomainRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    @Transactional
    public BlacklistedDomain addBlacklistDomain(String pattern, String reason) {
        if (pattern == null || pattern.trim().isBlank()) {
            throw new IllegalArgumentException("Domain pattern cannot be blank");
        }
        String cleanPattern = pattern.trim().toLowerCase();
        if (blacklistedDomainRepository.existsByDomainPatternIgnoreCase(cleanPattern)) {
            throw new IllegalArgumentException("Domain pattern already blacklisted: " + cleanPattern);
        }

        BlacklistedDomain item = BlacklistedDomain.builder()
                .domainPattern(cleanPattern)
                .reason(reason != null ? reason.trim() : "Flagged malicious domain")
                .build();
        return blacklistedDomainRepository.save(item);
    }

    @Transactional
    public void deleteBlacklistDomain(Long id) {
        blacklistedDomainRepository.deleteById(id);
    }

    public List<SystemSettingDto> getSystemSettings() {
        return systemSettingRepository.findAll().stream()
                .map(s -> SystemSettingDto.builder()
                        .settingKey(s.getSettingKey())
                        .settingValue(s.getSettingValue())
                        .description(s.getDescription())
                        .updatedAt(s.getUpdatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public SystemSettingDto updateSystemSetting(String key, String value, String description) {
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("Setting key cannot be blank");
        }
        SystemSetting setting = systemSettingRepository.findBySettingKey(key.trim())
                .orElseGet(() -> SystemSetting.builder()
                        .settingKey(key.trim())
                        .build());

        setting.setSettingValue(value != null ? value.trim() : "");
        if (description != null && !description.isBlank()) {
            setting.setDescription(description.trim());
        }
        setting = systemSettingRepository.save(setting);

        return SystemSettingDto.builder()
                .settingKey(setting.getSettingKey())
                .settingValue(setting.getSettingValue())
                .description(setting.getDescription())
                .updatedAt(setting.getUpdatedAt())
                .build();
    }

    private AdminLinkDto toAdminLinkDto(Url u) {
        long clicks = u.getStatistic() != null && u.getStatistic().getAccessedTimes() != null
                ? u.getStatistic().getAccessedTimes() : 0;
        User owner = u.getUser();

        return AdminLinkDto.builder()
                .id(u.getId())
                .shortUrl(u.getShortUrl())
                .fullShortUrl(rootDomainUrl + "/" + u.getShortUrl())
                .longUrl(u.getLongUrl())
                .createdAt(u.getCreatedAt())
                .expiresAt(u.getExpiresAt())
                .isActive(u.isActive())
                .isQuarantined(u.isQuarantined())
                .quarantineReason(u.getQuarantineReason())
                .isPasswordProtected(u.getPasswordHash() != null && !u.getPasswordHash().isEmpty())
                .totalClicks(clicks)
                .userEmail(owner != null ? owner.getEmail() : "Anonymous")
                .username(owner != null ? owner.getUsername() : "Anonymous")
                .userPublicId(owner != null ? owner.getPublicId() : null)
                .build();
    }

    private AdminUserDto toAdminUserDto(User u) {
        long linkCount = u.getUrls() != null ? u.getUrls().size() : 0;
        long totalClicks = 0;
        if (u.getUrls() != null) {
            for (Url l : u.getUrls()) {
                if (l.getStatistic() != null && l.getStatistic().getAccessedTimes() != null) {
                    totalClicks += l.getStatistic().getAccessedTimes();
                }
            }
        }

        return AdminUserDto.builder()
                .id(u.getId())
                .publicId(u.getPublicId())
                .username(u.getUsername())
                .email(u.getEmail())
                .role(u.getRole())
                .emailVerified(u.isEmailVerified())
                .isSuspended(u.isSuspended())
                .suspendedReason(u.getSuspendedReason())
                .linkCount(linkCount)
                .totalClicks(totalClicks)
                .createdAt(u.getCreatedAt())
                .build();
    }

    private void evictCache(String shortUrl) {
        try {
            redisTemplate.delete("urls::" + shortUrl);
            Cache cache = cacheManager.getCache("urls");
            if (cache != null) {
                cache.evict(shortUrl);
            }
        } catch (Exception e) {
            log.warn("Failed to evict cache for short URL {}: {}", shortUrl, e.getMessage());
        }
    }
}
