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
    private final com.url_shortener.url_shortener.security.SecurityIncidentRepository securityIncidentRepository;
    private final com.url_shortener.url_shortener.security.ThreatScannerService threatScannerService;
    private final com.url_shortener.url_shortener.security.BlockedIpService blockedIpService;
    private final com.url_shortener.url_shortener.admin.audit.AdminAuditService adminAuditService;
    private final EnvSyncService envSyncService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private org.springframework.mail.javamail.JavaMailSender javaMailSender;

    @Value("${app.domain.root}")
    private String rootDomainUrl;

    @Value("${app.frontend.url:http://localhost}")
    private String frontendUrl;

    @Value("${app.dashboard.url:http://app.localhost}")
    private String dashboardUrl;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${spring.mail.port:587}")
    private int mailPort;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${root.user.email:admin@trim.com}")
    private String rootUserEmail;

    @Value("${oauth.google.client-id:${GOOGLE_CLIENT_ID:}}")
    private String googleClientId;

    @Value("${oauth.github.client-id:${GITHUB_CLIENT_ID:}}")
    private String githubClientId;

    @Value("${spring.data.redis.host:redis}")
    private String redisHost;

    @Value("${spring.data.redis.port:6379}")
    private int redisPort;

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
        return getLinks(page, size, search, status, null, null, null, null, "createdAt", "DESC");
    }

    public Page<AdminLinkDto> getLinks(
            int page,
            int size,
            String search,
            String status,
            LocalDateTime startDate,
            LocalDateTime endDate,
            Long minClicks,
            String domain,
            String sortBy,
            String sortDir
    ) {
        Sort.Direction direction = "ASC".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        String property = "createdAt";
        if ("clicks".equalsIgnoreCase(sortBy)) {
            property = "statistic.accessedTimes";
        }
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, property));

        org.springframework.data.jpa.domain.Specification<Url> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();

            if (search != null && !search.trim().isEmpty()) {
                String term = "%" + search.trim().toLowerCase() + "%";
                var userJoin = root.join("user", jakarta.persistence.criteria.JoinType.LEFT);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("shortUrl")), term),
                        cb.like(cb.lower(root.get("longUrl")), term),
                        cb.like(cb.lower(userJoin.get("email")), term),
                        cb.like(cb.lower(userJoin.get("username")), term)
                ));
            }

            if (domain != null && !domain.trim().isEmpty()) {
                String domainTerm = "%" + domain.trim().toLowerCase() + "%";
                predicates.add(cb.like(cb.lower(root.get("longUrl")), domainTerm));
            }

            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDate));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), endDate));
            }

            if (minClicks != null && minClicks > 0) {
                var statJoin = root.join("statistic", jakarta.persistence.criteria.JoinType.LEFT);
                predicates.add(cb.greaterThanOrEqualTo(statJoin.get("accessedTimes"), minClicks));
            }

            if (status != null && !status.trim().isEmpty() && !"all".equalsIgnoreCase(status)) {
                String st = status.trim().toLowerCase();
                if ("needs_review".equals(st)) {
                    LocalDateTime past24h = LocalDateTime.now().minusHours(24);
                    predicates.add(cb.or(
                            cb.isTrue(root.get("isQuarantined")),
                            cb.greaterThanOrEqualTo(root.get("createdAt"), past24h)
                    ));
                } else if ("quarantined".equals(st)) {
                    predicates.add(cb.isTrue(root.get("isQuarantined")));
                } else if ("active".equals(st)) {
                    predicates.add(cb.and(
                            cb.isTrue(root.get("isActive")),
                            cb.isFalse(root.get("isQuarantined"))
                    ));
                } else if ("expired".equals(st)) {
                    predicates.add(cb.and(
                            cb.isFalse(root.get("isActive")),
                            cb.isFalse(root.get("isQuarantined"))
                    ));
                } else if ("spikes".equals(st)) {
                    var statJoin = root.join("statistic", jakarta.persistence.criteria.JoinType.LEFT);
                    predicates.add(cb.greaterThanOrEqualTo(statJoin.get("accessedTimes"), 500L));
                }
            }

            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        Page<Url> urlPage = urlRepository.findAll(spec, pageable);
        return urlPage.map(this::toAdminLinkDto);
    }

    public AdminLinkTriageSummaryDto getTriageSummary() {
        long quarantined = urlRepository.countByIsQuarantinedTrue();
        long createdLast24h = urlRepository.countByCreatedAtAfter(LocalDateTime.now().minusHours(24));
        long spikes = 0;
        try {
            spikes = urlRepository.countByMinClicks(500L);
        } catch (Exception e) {
            log.warn("Failed to count spike clicks: {}", e.getMessage());
        }
        long needsAttention = quarantined + createdLast24h;
        long totalLinks = urlRepository.count();

        return AdminLinkTriageSummaryDto.builder()
                .needsAttentionCount(needsAttention)
                .spikeCount(spikes)
                .quarantinedCount(quarantined)
                .createdLast24hCount(createdLast24h)
                .totalLinks(totalLinks)
                .build();
    }

    @Transactional
    public List<AdminLinkDto> bulkQuarantineLinks(List<String> hashes, String reason) {
        if (hashes == null || hashes.isEmpty()) {
            return Collections.emptyList();
        }
        List<Url> urls = urlRepository.findAllByShortUrlIn(hashes);
        String r = reason != null && !reason.trim().isEmpty() ? reason.trim() : "Bulk quarantine by administrator";
        for (Url u : urls) {
            u.setQuarantined(true);
            u.setQuarantineReason(r);
            u.setActive(false);
            evictCache(u.getShortUrl());
        }
        urls = urlRepository.saveAll(urls);
        recordAudit("BULK_LINK_QUARANTINED", "LINK", String.join(",", hashes),
                "Bulk quarantined " + hashes.size() + " link(s). Reason: " + r,
                "{\"count\":" + hashes.size() + ",\"hashes\":" + hashes + "}");
        return urls.stream().map(this::toAdminLinkDto).collect(Collectors.toList());
    }

    @Transactional
    public void bulkDeleteLinks(List<String> hashes) {
        if (hashes == null || hashes.isEmpty()) {
            return;
        }
        List<Url> urls = urlRepository.findAllByShortUrlIn(hashes);
        for (Url u : urls) {
            evictCache(u.getShortUrl());
        }
        urlRepository.deleteAll(urls);
        recordAudit("BULK_LINK_DELETED", "LINK", String.join(",", hashes),
                "Bulk deleted " + hashes.size() + " link(s)",
                "{\"count\":" + hashes.size() + ",\"hashes\":" + hashes + "}");
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

        recordAudit("LINK_QUARANTINED", "LINK", hash,
                "Quarantined link /" + hash + ". Reason: " + url.getQuarantineReason(),
                "{\"longUrl\":\"" + url.getLongUrl() + "\"}");

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

        recordAudit("LINK_UNQUARANTINED", "LINK", hash,
                "Restored quarantined link /" + hash,
                "{\"longUrl\":\"" + url.getLongUrl() + "\"}");

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

        recordAudit("LINK_DELETED", "LINK", hash,
                "Deleted link /" + hash,
                "{\"longUrl\":\"" + url.getLongUrl() + "\"}");
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

        recordAudit(willSuspend ? "USER_SUSPENDED" : "USER_UNSUSPENDED", "USER", user.getEmail(),
                (willSuspend ? "Suspended user " : "Restored user ") + user.getEmail() + (reason != null ? ". Reason: " + reason : ""),
                "{\"userId\":" + user.getId() + ",\"email\":\"" + user.getEmail() + "\"}");

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

        Role oldRole = user.getRole();
        user.setRole(newRole);
        user = userRepository.save(user);

        recordAudit("USER_ROLE_CHANGED", "USER", user.getEmail(),
                "Changed role of user " + user.getEmail() + " from " + oldRole + " to " + newRole,
                "{\"oldRole\":\"" + oldRole + "\",\"newRole\":\"" + newRole + "\"}");

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
        item = blacklistedDomainRepository.save(item);

        recordAudit("DOMAIN_BLOCKED", "DOMAIN", cleanPattern,
                "Added domain to blacklist: " + cleanPattern + ". Reason: " + item.getReason(),
                "{\"domain\":\"" + cleanPattern + "\"}");

        return item;
    }

    @Transactional
    public void deleteBlacklistDomain(Long id) {
        var domainObj = blacklistedDomainRepository.findById(id).orElse(null);
        blacklistedDomainRepository.deleteById(id);

        recordAudit("DOMAIN_UNBLOCKED", "DOMAIN", domainObj != null ? domainObj.getDomainPattern() : String.valueOf(id),
                "Removed domain from blacklist: " + (domainObj != null ? domainObj.getDomainPattern() : id), null);
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

        String oldValue = setting.getSettingValue();
        setting.setSettingValue(value != null ? value.trim() : "");
        if (description != null && !description.isBlank()) {
            setting.setDescription(description.trim());
        }
        setting = systemSettingRepository.save(setting);

        recordAudit("SETTING_UPDATED", "SETTING", key.trim(),
                "Updated setting " + key.trim() + " = " + value,
                "{\"key\":\"" + key.trim() + "\",\"oldValue\":\"" + oldValue + "\",\"newValue\":\"" + value + "\"}");

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

    public Page<com.url_shortener.url_shortener.security.SecurityIncident> getSecurityIncidents(int page, int size, Boolean resolved) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        if (resolved != null) {
            return securityIncidentRepository.findByIsResolved(resolved, pageable);
        }
        return securityIncidentRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    @Transactional
    public com.url_shortener.url_shortener.security.SecurityIncident resolveSecurityIncident(Long id, String resolvedBy) {
        var incident = securityIncidentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Security incident not found: " + id));
        incident.setIsResolved(true);
        incident.setResolvedAt(LocalDateTime.now());
        incident.setResolvedBy(resolvedBy != null ? resolvedBy : "ADMIN");
        incident = securityIncidentRepository.save(incident);

        recordAudit("INCIDENT_RESOLVED", "INCIDENT", String.valueOf(id),
                "Resolved security incident #" + id + " (" + incident.getIncidentType() + ")",
                "{\"incidentId\":" + id + ",\"type\":\"" + incident.getIncidentType() + "\"}");

        return incident;
    }

    public com.url_shortener.url_shortener.security.dto.ThreatScanResultDto testThreatScanner(String url) {
        return threatScannerService.scanUrl(url);
    }

    public List<com.url_shortener.url_shortener.security.BlockedIp> getBlockedIps() {
        return blockedIpService.getAllBlockedIps();
    }

    @Transactional
    public com.url_shortener.url_shortener.security.BlockedIp addBlockedIp(String ipAddress, String reason, String createdBy) {
        var blocked = blockedIpService.blockIp(ipAddress, reason, createdBy);

        recordAudit("IP_BLOCKED", "IP", ipAddress,
                "Blocked perimeter IP/subnet: " + ipAddress + ". Reason: " + reason,
                "{\"ipAddress\":\"" + ipAddress + "\",\"reason\":\"" + reason + "\"}");

        return blocked;
    }

    @Transactional
    public void deleteBlockedIp(Long id) {
        var ipObj = blockedIpService.getAllBlockedIps().stream()
                .filter(b -> b.getId().equals(id))
                .findFirst()
                .orElse(null);
        blockedIpService.unblockIp(id);
        recordAudit("IP_UNBLOCKED", "IP", ipObj != null ? ipObj.getIpAddress() : String.valueOf(id),
                "Unblocked perimeter IP: " + (ipObj != null ? ipObj.getIpAddress() : id), null);
    }

    private void recordAudit(String action, String targetType, String targetIdentifier, String details, String metadataJson) {
        try {
            var ctx = com.url_shortener.url_shortener.admin.audit.AdminAuditContextHolder.getContext();
            Long actorId = ctx != null ? ctx.getActorId() : null;
            String actorEmail = ctx != null ? ctx.getActorEmail() : null;
            String actorRole = ctx != null ? ctx.getActorRole() : null;
            String actorIp = ctx != null ? ctx.getActorIp() : null;

            if (actorEmail == null) {
                org.springframework.security.core.Authentication auth =
                        org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                if (auth != null) {
                    actorEmail = auth.getName();
                    if (auth.getPrincipal() instanceof Long) {
                        actorId = (Long) auth.getPrincipal();
                    }
                    if (auth.getAuthorities() != null && !auth.getAuthorities().isEmpty()) {
                        actorRole = auth.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
                    }
                }
            }

            adminAuditService.record(actorId, actorEmail, actorRole, actorIp, action, targetType, targetIdentifier, details, metadataJson);
        } catch (Exception e) {
            log.warn("Failed to record audit log for action {}: {}", action, e.getMessage());
        }
    }

    /**
     * Resolves effective setting with priority: system_settings DB table -> .env file -> fallback default.
     */
    public String getEffectiveSetting(String key, String defaultValue) {
        if (key == null) return defaultValue;
        try {
            var dbSetting = systemSettingRepository.findBySettingKey(key.trim());
            if (dbSetting.isPresent() && !dbSetting.get().getSettingValue().isBlank()) {
                return dbSetting.get().getSettingValue().trim();
            }
        } catch (Exception ignored) {}

        Map<String, String> envMap = envSyncService.readEnvMap();
        if (envMap.containsKey(key.trim())) {
            return envMap.get(key.trim());
        }

        return defaultValue;
    }

    /**
     * Returns sanitized and masked environment vault items across categories.
     */
    public List<EnvironmentVaultDto> getEnvironmentVault() {
        Map<String, String> envMap = envSyncService.readEnvMap();
        List<EnvironmentVaultDto> items = new ArrayList<>();

        // Group definitions: key, category, isSecret, description
        record EnvDef(String key, String category, boolean isSecret, String description, String fallback) {}
        List<EnvDef> definitions = List.of(
                // 1. Instance & Policies
                new EnvDef("APP_SELF_HOSTED", "SYSTEM", false, "Flag indicating if instance is operating in self-hosted mode", "false"),
                new EnvDef("ALLOW_REGISTRATION", "SYSTEM", false, "Allows or forbids new user public account registrations", "true"),
                new EnvDef("REQUIRE_EMAIL_VERIFICATION", "SYSTEM", false, "Enforces email confirmation before URL shortening privileges", "true"),
                new EnvDef("PANIC_MODE", "SYSTEM", false, "Emergency lockdown: NORMAL, READ_ONLY, or MAINTENANCE", "NORMAL"),
                new EnvDef("MAX_LINKS_PER_USER", "SYSTEM", false, "Maximum links quota for standard user accounts", "1000"),
                new EnvDef("DEFAULT_LINK_EXPIRATION_DAYS", "SYSTEM", false, "Default forced link expiry in days (0 for permanent)", "0"),

                // 2. Database & Cache
                new EnvDef("SPRING_DATASOURCE_URL", "DATABASE", false, "JDBC connection string for MySQL database", "jdbc:mysql://mysql:3306/url_shortener"),
                new EnvDef("SPRING_DATASOURCE_USERNAME", "DATABASE", false, "Database username", "root"),
                new EnvDef("SPRING_DATASOURCE_PASSWORD", "DATABASE", true, "Database root password", ""),
                new EnvDef("REDIS_HOST", "DATABASE", false, "Redis caching host address", redisHost),
                new EnvDef("REDIS_PORT", "DATABASE", false, "Redis server port", String.valueOf(redisPort)),

                // 3. Routing & Domains
                new EnvDef("ROOT_DOMAIN_URL", "ROUTING", false, "Base domain URL used for public shortened redirection links", rootDomainUrl),
                new EnvDef("APP_DOMAIN_URL", "ROUTING", false, "CORS allowed origin list for web clients", frontendUrl),
                new EnvDef("APP_DASHBOARD_URL", "ROUTING", false, "Origin of user and admin dashboard portal", dashboardUrl),
                new EnvDef("API_DOMAIN_NAME", "ROUTING", false, "Nginx reverse proxy API domain name", "api.localhost"),
                new EnvDef("APP_DOMAIN_NAME", "ROUTING", false, "Nginx reverse proxy app domain name", "app.localhost"),
                new EnvDef("ROOT_DOMAIN_NAME", "ROUTING", false, "Nginx reverse proxy root domain name", "localhost"),

                // 4. Security & Authentication
                new EnvDef("JWT_SECRET", "SECURITY", true, "HMAC-SHA secret key used for signing JWT tokens", ""),
                new EnvDef("JWT_ACCESS_TOKEN_EXPIRATION", "SECURITY", false, "Access token validity in seconds", "900"),
                new EnvDef("JWT_REFRESH_TOKEN_EXPIRATION", "SECURITY", false, "Refresh token validity in seconds", "604800"),
                new EnvDef("ROOT_USER_EMAIL", "SECURITY", false, "Root system owner email address", rootUserEmail),
                new EnvDef("ROOT_USER_PASSWORD", "SECURITY", true, "Root administrator initial credential", ""),
                new EnvDef("SAFE_BROWSING_API_KEY", "SECURITY", true, "Google Safe Browsing v4 Threat API Key", ""),

                // 5. Mail & SMTP
                new EnvDef("SPRING_MAIL_HOST", "MAIL", false, "SMTP server hostname", mailHost),
                new EnvDef("SPRING_MAIL_PORT", "MAIL", false, "SMTP port (typically 587 or 465)", String.valueOf(mailPort)),
                new EnvDef("SPRING_MAIL_USERNAME", "MAIL", false, "SMTP account username / email", mailUsername),
                new EnvDef("SPRING_MAIL_PASSWORD", "MAIL", true, "SMTP account app password", ""),
                new EnvDef("SPRING_MAIL_SMTP_AUTH", "MAIL", false, "SMTP authentication flag", "true"),
                new EnvDef("SPRING_MAIL_SMTP_STARTTLS_ENABLE", "MAIL", false, "STARTTLS encryption enablement", "true"),

                // 6. OAuth Providers
                new EnvDef("OAUTH_GOOGLE_CLIENT_ID", "OAUTH", false, "Google OAuth 2.0 Web Client ID", googleClientId),
                new EnvDef("OAUTH_GOOGLE_CLIENT_SECRET", "OAUTH", true, "Google OAuth 2.0 Client Secret", ""),
                new EnvDef("OAUTH_GITHUB_CLIENT_ID", "OAUTH", false, "GitHub OAuth App Client ID", githubClientId),
                new EnvDef("OAUTH_GITHUB_CLIENT_SECRET", "OAUTH", true, "GitHub OAuth App Client Secret", "")
        );

        for (EnvDef def : definitions) {
            String val = envMap.getOrDefault(def.key, def.fallback);
            String source = "ENV";

            // Check if overridden in dynamic DB system_settings
            var dbSetting = systemSettingRepository.findBySettingKey(def.key);
            if (dbSetting.isPresent() && !dbSetting.get().getSettingValue().isBlank()) {
                val = dbSetting.get().getSettingValue();
                source = "DYNAMIC_OVERRIDE";
            }

            items.add(EnvironmentVaultDto.builder()
                    .key(def.key)
                    .category(def.category)
                    .value(val != null ? val : "")
                    .isSecret(def.isSecret)
                    .source(source)
                    .description(def.description)
                    .build());
        }

        return items;
    }

    /**
     * Updates an environment variable in both .env and dynamic system_settings table for immediate effect.
     */
    @Transactional
    public EnvironmentVaultDto updateEnvVariable(String key, String value) {
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("Variable key cannot be blank");
        }
        String cleanKey = key.trim();
        String cleanVal = value != null ? value.trim() : "";

        // 1. Sync to .env file on disk
        boolean syncedToEnv = envSyncService.updateEnvVariable(cleanKey, cleanVal);

        // 2. Save in system_settings database for dynamic runtime resolution
        SystemSetting setting = systemSettingRepository.findBySettingKey(cleanKey)
                .orElseGet(() -> SystemSetting.builder().settingKey(cleanKey).build());
        String oldValue = setting.getSettingValue();
        setting.setSettingValue(cleanVal);
        setting.setDescription("Configured via Admin Environment Vault");
        systemSettingRepository.save(setting);

        recordAudit("ENV_VARIABLE_UPDATED", "VAULT", cleanKey,
                "Updated environment variable " + cleanKey + " (synced to .env: " + syncedToEnv + ")",
                "{\"key\":\"" + cleanKey + "\",\"oldValue\":\"" + (cleanKey.contains("SECRET") || cleanKey.contains("PASSWORD") ? "******" : oldValue) + "\"}");

        return EnvironmentVaultDto.builder()
                .key(cleanKey)
                .category("CONFIG")
                .value(cleanVal)
                .isSecret(cleanKey.contains("SECRET") || cleanKey.contains("PASSWORD"))
                .source(syncedToEnv ? "ENV_AND_OVERRIDE" : "DYNAMIC_OVERRIDE")
                .description("Synchronized live environment variable")
                .build();
    }

    /**
     * Diagnostic SMTP connection and delivery tester.
     */
    public SmtpTestResultDto testSmtpConnection(String recipientEmail) {
        long startTime = System.currentTimeMillis();
        String effectiveHost = getEffectiveSetting("SPRING_MAIL_HOST", mailHost);
        int effectivePort = mailPort;
        try {
            effectivePort = Integer.parseInt(getEffectiveSetting("SPRING_MAIL_PORT", String.valueOf(mailPort)));
        } catch (NumberFormatException ignored) {}
        String effectiveUser = getEffectiveSetting("SPRING_MAIL_USERNAME", mailUsername);

        if (effectiveHost == null || effectiveHost.isBlank()) {
            return SmtpTestResultDto.builder()
                    .success(false)
                    .latencyMs(System.currentTimeMillis() - startTime)
                    .host("None")
                    .port(effectivePort)
                    .fromEmail(effectiveUser)
                    .message("SMTP Host is not configured. Set SPRING_MAIL_HOST in the Environment Vault.")
                    .build();
        }

        if (javaMailSender == null) {
            return SmtpTestResultDto.builder()
                    .success(false)
                    .latencyMs(System.currentTimeMillis() - startTime)
                    .host(effectiveHost)
                    .port(effectivePort)
                    .fromEmail(effectiveUser)
                    .message("JavaMailSender bean is unavailable. Ensure SMTP settings are saved.")
                    .build();
        }

        try {
            var mimeMessage = javaMailSender.createMimeMessage();
            var helper = new org.springframework.mail.javamail.MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(effectiveUser != null && !effectiveUser.isBlank() ? effectiveUser : "noreply@trim.com");
            helper.setTo(recipientEmail);
            helper.setSubject("Trim SMTP Connection Diagnostic Test");
            helper.setText("""
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <h2 style="color: #0f172a; margin-bottom: 12px;">Trim SMTP Verification Successful</h2>
                        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                            This test email confirms that your SMTP mail host (<strong>%s:%d</strong>) is correctly configured and operational.
                        </p>
                        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
                            Sent by Trim Admin Environment Vault at %s
                        </p>
                    </div>
                    """.formatted(effectiveHost, effectivePort, LocalDateTime.now().toString()), true);

            javaMailSender.send(mimeMessage);
            long latency = System.currentTimeMillis() - startTime;

            recordAudit("SMTP_DIAGNOSTIC_TEST", "MAIL", recipientEmail,
                    "Dispatched SMTP test email to " + recipientEmail + " (latency: " + latency + "ms)", null);

            return SmtpTestResultDto.builder()
                    .success(true)
                    .latencyMs(latency)
                    .host(effectiveHost)
                    .port(effectivePort)
                    .fromEmail(effectiveUser)
                    .message("Diagnostic email dispatched successfully to " + recipientEmail)
                    .build();
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - startTime;
            log.warn("SMTP test failed for {}: {}", recipientEmail, e.getMessage());
            return SmtpTestResultDto.builder()
                    .success(false)
                    .latencyMs(latency)
                    .host(effectiveHost)
                    .port(effectivePort)
                    .fromEmail(effectiveUser)
                    .message("SMTP Error: " + e.getMessage())
                    .build();
        }
    }
}
