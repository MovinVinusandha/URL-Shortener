package com.url_shortener.url_shortener.urls;

import com.url_shortener.url_shortener.analytics.ClickEventRepository;
import com.url_shortener.url_shortener.statistics.Statistic;
import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserNotFoundException;
import com.url_shortener.url_shortener.users.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigInteger;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.zip.CRC32;

import org.springframework.security.access.AccessDeniedException;

@Service
@lombok.RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class UrlService {
    private final UrlMapper urlMapper;
    private final UrlRepository urlRepository;
    private final UserRepository userRepository;
    private final ClickEventRepository clickEventRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final TagRepository tagRepository;
    private final FolderRepository folderRepository;
    private final com.url_shortener.url_shortener.admin.BlacklistedDomainRepository blacklistedDomainRepository;
    private final com.url_shortener.url_shortener.admin.SystemSettingRepository systemSettingRepository;

    @org.springframework.beans.factory.annotation.Autowired 
    private org.springframework.cache.CacheManager cacheManager;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.url_shortener.url_shortener.security.ThreatScannerService threatScannerService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.url_shortener.url_shortener.security.SpamVelocityService spamVelocityService;

    @org.springframework.beans.factory.annotation.Value("${app.domain.root}")
    private String rootDomainUrl;

    public UrlSend generateShortUrl(UrlRequest urlRequest) {
        return generateShortUrl(urlRequest, null);
    }

    public UrlSend generateShortUrl(UrlRequest urlRequest, String clientIp) {
        String panicMode = systemSettingRepository.findBySettingKey("PANIC_MODE")
                .map(s -> s.getSettingValue().toUpperCase())
                .orElse("NORMAL");

        if ("MAINTENANCE".equals(panicMode)) {
            throw new IllegalStateException("The system is currently undergoing scheduled maintenance. Link creation is paused.");
        }
        if ("READ_ONLY".equals(panicMode)) {
            throw new IllegalStateException("The system is currently operating in read-only lockdown mode. New link creation is temporarily halted.");
        }

        if (isDomainBlacklisted(urlRequest.getLongUrl())) {
            throw new IllegalArgumentException("The destination URL domain is blacklisted or prohibited on this instance.");
        }

        Long currentUserId = null;
        String currentUserEmail = null;
        var authCheck = SecurityContextHolder.getContext().getAuthentication();
        if (authCheck != null && authCheck.isAuthenticated() && !"anonymousUser".equals(authCheck.getPrincipal())) {
            if (authCheck.getPrincipal() instanceof Long) {
                currentUserId = (Long) authCheck.getPrincipal();
            }
            currentUserEmail = authCheck.getName();
        }
        if (spamVelocityService != null) {
            spamVelocityService.checkAndRecordVelocity(currentUserId, currentUserEmail, clientIp);
        }

        if (threatScannerService != null) {
            var scan = threatScannerService.scanUrl(urlRequest.getLongUrl());
            if (!scan.isSafe() && scan.getRiskScore() >= 70) {
                throw new IllegalArgumentException("Destination URL rejected by threat intelligence: " + String.join(", ", scan.getDetectedThreats()));
            }
        }
        String hash;
        if (urlRequest.getCustomAlias() != null && !urlRequest.getCustomAlias().trim().isEmpty()) {
            String alias = urlRequest.getCustomAlias().trim();
            if (!alias.matches("^[a-zA-Z0-9-_]+$")) {
                throw new IllegalArgumentException("Custom alias can only contain letters, numbers, hyphens, and underscores.");
            }
            if (urlRepository.existsUrlByShortUrl(alias)) {
                throw new AliasAlreadyExistsException();
            }
            hash = alias;
        } else {
            hash = generateUrlHash(urlRequest.getLongUrl());
            if (urlRepository.existsUrlByShortUrl(hash)) {
                throw new UrlExistInDataBaseException();
            }
        }
        var url = urlMapper.toEntity(urlRequest);
        url.setShortUrl(hash);
        
        url.setActive(true);

        // Apply default link expiration if not explicitly provided
        if (url.getExpiresAt() == null) {
            systemSettingRepository.findBySettingKey("DEFAULT_LINK_EXPIRATION_DAYS")
                    .ifPresent(s -> {
                        try {
                            long days = Long.parseLong(s.getSettingValue().trim());
                            if (days > 0) {
                                url.setExpiresAt(java.time.LocalDateTime.now(java.time.ZoneOffset.UTC).plusDays(days));
                            }
                        } catch (Exception ignored) {}
                    });
        }

        if (url.getExpiresAt() != null && url.getExpiresAt().isBefore(java.time.LocalDateTime.now(java.time.ZoneOffset.UTC))) {
            url.setActive(false);
        }
        
        if (urlRequest.getPassword() != null && !urlRequest.getPassword().trim().isEmpty()) {
            var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
                throw new AccessDeniedException("You must be logged in to set a password.");
            }
            url.setPasswordHash(passwordEncoder.encode(urlRequest.getPassword().trim()));
        }

        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.isAuthenticated()
                && !"anonymousUser".equals(authentication.getPrincipal())
        ) {
            System.out.println(authentication.getPrincipal());
            var user = userRepository.findById((Long) authentication.getPrincipal()).orElse(null);
            if (user == null) {
                throw new UserNotFoundException();
            }
            if (user.isSuspended()) {
                throw new AccessDeniedException("Your account has been suspended by an administrator.");
            }

            // Enforce max links per user quota (for non-ROOT/ADMIN users)
            if (user.getRole() == com.url_shortener.url_shortener.users.Role.USER) {
                long maxLinks = 1000;
                try {
                    var quotaSetting = systemSettingRepository.findBySettingKey("MAX_LINKS_PER_USER");
                    if (quotaSetting.isPresent() && !quotaSetting.get().getSettingValue().isBlank()) {
                        maxLinks = Long.parseLong(quotaSetting.get().getSettingValue().trim());
                    }
                } catch (Exception ignored) {}

                long currentLinks = urlRepository.countByUserId(user.getId());
                if (currentLinks >= maxLinks) {
                    throw new AccessDeniedException("You have reached the maximum allowed link quota (" + maxLinks + ") for your account.");
                }
            }

            url.setUser(user);
        }

        if (urlRequest.getTagIds() != null && !urlRequest.getTagIds().isEmpty()) {
            if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
                throw new AccessDeniedException("You must be logged in to assign tags.");
            }
            Long userId = (Long) authentication.getPrincipal();
            User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);
            
            List<Tag> requestedTags = tagRepository.findAllById(urlRequest.getTagIds());
            for (Tag t : requestedTags) {
                if (!t.getUser().getId().equals(userId)) {
                    throw new AccessDeniedException("You cannot assign a tag you do not own.");
                }
            }
            url.setTags(new HashSet<>(requestedTags));
        }

        if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getPrincipal())) {
            Long userId = (Long) authentication.getPrincipal();
            if (urlRequest.getFolderId() != null) {
                Folder folder = folderRepository.findById(urlRequest.getFolderId())
                        .orElseThrow(FolderNotFoundException::new);
                
                if (!folder.getUser().getId().equals(userId)) {
                    throw new AccessDeniedException("You cannot assign a folder you do not own.");
                }
                url.setFolder(folder);
            } else {
                Folder defaultFolder = folderRepository.findByUserIdAndSlug(userId, "links")
                        .orElseGet(() -> folderRepository.findByNameIgnoreCaseAndUserId("Links", userId)
                                .orElseGet(() -> {
                                    User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);
                                    Folder newDefault = Folder.builder()
                                            .name("Links")
                                            .slug("links")
                                            .user(user)
                                            .build();
                                    return folderRepository.save(newDefault);
                                }));
                url.setFolder(defaultFolder);
            }
        }

        var savedUrl = urlRepository.save(url);

        var stat = Statistic.builder()
                .accessedTimes(0L)
                .urls(url)
                .build();

        url.addStatistic(stat);

        urlRepository.save(url);
        
        String cacheKey = "urls::" + url.getShortUrl();
        if (url.getExpiresAt() != null) {
            java.time.Duration ttl = java.time.Duration.between(java.time.LocalDateTime.now(java.time.ZoneOffset.UTC), url.getExpiresAt());
            if (!ttl.isNegative()) {
                redisTemplate.opsForValue().set(cacheKey, url.getLongUrl(), ttl);
            }
        } else {
            redisTemplate.opsForValue().set(cacheKey, url.getLongUrl(), java.time.Duration.ofHours(24));
        }

        if (threatScannerService != null) {
            threatScannerService.scanAndEnforceAsync(url.getShortUrl(), url.getLongUrl(), currentUserEmail, clientIp);
        }
        
        var sendDto = urlMapper.toSendDto(url);
        String fullShortUrl = rootDomainUrl + "/" + url.getShortUrl();
        sendDto.setShortUrl(fullShortUrl);
        return sendDto;
    }

    @org.springframework.transaction.annotation.Transactional
    public BatchCampaignResponseDto createBatchCampaignUrls(BatchCampaignRequestDto request, User currentUser) {
        String panicMode = systemSettingRepository.findBySettingKey("PANIC_MODE")
                .map(s -> s.getSettingValue().toUpperCase())
                .orElse("NORMAL");

        if ("MAINTENANCE".equals(panicMode)) {
            throw new IllegalStateException("The system is currently undergoing scheduled maintenance. Batch link creation is paused.");
        }
        if ("READ_ONLY".equals(panicMode)) {
            throw new IllegalStateException("The system is currently operating in read-only lockdown mode. Batch link creation is temporarily halted.");
        }

        if (currentUser.isSuspended()) {
            throw new AccessDeniedException("Your account has been suspended by an administrator.");
        }
        if (isDomainBlacklisted(request.getLongUrl())) {
            throw new IllegalArgumentException("The destination URL domain is blacklisted or prohibited on this instance.");
        }

        Folder folder = null;
        if (request.getFolderId() != null) {
            folder = folderRepository.findById(request.getFolderId())
                    .orElseThrow(() -> new IllegalArgumentException("Folder not found"));
            if (!folder.getUser().getId().equals(currentUser.getId())) {
                throw new AccessDeniedException("You do not own this folder.");
            }
        } else {
            folder = folderRepository.findByNameIgnoreCaseAndUserId("Links", currentUser.getId())
                    .orElseGet(() -> folderRepository.save(Folder.builder()
                            .name("Links")
                            .slug("links")
                            .user(currentUser)
                            .build()));
        }

        Set<Tag> tags = new HashSet<>();
        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            List<Tag> foundTags = tagRepository.findAllById(request.getTagIds());
            for (Tag t : foundTags) {
                if (!t.getUser().getId().equals(currentUser.getId())) {
                    throw new AccessDeniedException("You cannot assign a tag you do not own.");
                }
            }
            tags.addAll(foundTags);
        }

        List<BatchCampaignResultItemDto> resultItems = new java.util.ArrayList<>();

        for (BatchChannelItemDto channel : request.getChannels()) {
            String fullTargetUrl = appendUtmParams(request.getLongUrl(), request.getCampaignName(), channel);
            
            String hash = generateUrlHash(fullTargetUrl);
            int attempts = 0;
            while (urlRepository.existsUrlByShortUrl(hash) && attempts < 10) {
                hash = generateUrlHash(fullTargetUrl + "#" + System.nanoTime() + "#" + Math.random());
                attempts++;
            }

            Url url = Url.builder()
                    .longUrl(fullTargetUrl)
                    .shortUrl(hash)
                    .user(currentUser)
                    .folder(folder)
                    .tags(new HashSet<>(tags))
                    .isActive(true)
                    .build();

            Url savedUrl = urlRepository.save(url);

            Statistic stat = Statistic.builder()
                    .accessedTimes(0L)
                    .urls(savedUrl)
                    .build();
            savedUrl.addStatistic(stat);
            urlRepository.save(savedUrl);

            String cacheKey = "urls::" + savedUrl.getShortUrl();
            redisTemplate.opsForValue().set(cacheKey, savedUrl.getLongUrl(), java.time.Duration.ofHours(24));

            String fullShortUrl = rootDomainUrl + "/" + savedUrl.getShortUrl();
            resultItems.add(BatchCampaignResultItemDto.builder()
                    .channelName(channel.getName())
                    .shortUrl(savedUrl.getShortUrl())
                    .fullShortUrl(fullShortUrl)
                    .longUrlWithUtm(fullTargetUrl)
                    .utmSource(channel.getUtmSource())
                    .utmMedium(channel.getUtmMedium())
                    .urlId(savedUrl.getId())
                    .build());
        }

        return BatchCampaignResponseDto.builder()
                .campaignName(request.getCampaignName())
                .totalCreated(resultItems.size())
                .items(resultItems)
                .build();
    }

    public String appendUtmParams(String baseUrl, String campaign, BatchChannelItemDto channel) {
        StringBuilder sb = new StringBuilder(baseUrl.trim());
        boolean hasQuery = sb.indexOf("?") != -1;

        if (channel.getUtmSource() != null && !channel.getUtmSource().isBlank()) {
            appendQueryParam(sb, "utm_source", channel.getUtmSource(), hasQuery);
            hasQuery = true;
        }
        if (channel.getUtmMedium() != null && !channel.getUtmMedium().isBlank()) {
            appendQueryParam(sb, "utm_medium", channel.getUtmMedium(), hasQuery);
            hasQuery = true;
        }
        if (campaign != null && !campaign.isBlank()) {
            appendQueryParam(sb, "utm_campaign", campaign, hasQuery);
            hasQuery = true;
        }
        if (channel.getUtmTerm() != null && !channel.getUtmTerm().isBlank()) {
            appendQueryParam(sb, "utm_term", channel.getUtmTerm(), hasQuery);
            hasQuery = true;
        }
        if (channel.getUtmContent() != null && !channel.getUtmContent().isBlank()) {
            appendQueryParam(sb, "utm_content", channel.getUtmContent(), hasQuery);
            hasQuery = true;
        }
        return sb.toString();
    }

    private void appendQueryParam(StringBuilder sb, String key, String value, boolean hasQuery) {
        sb.append(hasQuery ? "&" : "?");
        sb.append(key);
        sb.append("=");
        sb.append(java.net.URLEncoder.encode(value.trim(), java.nio.charset.StandardCharsets.UTF_8));
    }

    public String generateUrlHash(String data){
        CRC32 CRC32 = new CRC32();
        CRC32.update(data.getBytes());
        return String.format(Locale.US,"%08X", CRC32.getValue());
    }

    private final org.springframework.data.redis.core.StringRedisTemplate redisTemplate;

    public String getLongUrlForRedirect(String shortUrl) {
        String panicMode = systemSettingRepository.findBySettingKey("PANIC_MODE")
                .map(s -> s.getSettingValue().toUpperCase())
                .orElse("NORMAL");

        if ("MAINTENANCE".equals(panicMode)) {
            throw new IllegalStateException("The system is currently undergoing scheduled maintenance. Redirection is temporarily paused.");
        }

        // Enforce strict lazy evaluation first
        var url = isExistsShortUrl(shortUrl);
        
        if (url.isQuarantined()) {
            throw new LinkQuarantinedException(shortUrl, url.getQuarantineReason());
        }

        if (url.getExpiresAt() != null && url.getExpiresAt().isBefore(java.time.LocalDateTime.now(java.time.ZoneOffset.UTC))) {
            url.setActive(false);
            urlRepository.save(url);
            redisTemplate.delete("urls::" + url.getShortUrl());
            throw new LinkExpiredException("Link expired");
        }
        if (!url.isActive()) {
            throw new LinkExpiredException("Link inactive");
        }
        
        log.info("Evaluating URL hash: {}. IsActive: {}, ExpiresAt: {}", url.getShortUrl(), url.isActive(), url.getExpiresAt());

        if (url.getPasswordHash() != null && !url.getPasswordHash().isEmpty()) {
            throw new PasswordProtectedException(shortUrl);
        }

        String cacheKey = "urls::" + shortUrl;
        String cachedUrl = redisTemplate.opsForValue().get(cacheKey);
        if (cachedUrl != null) {
            return cachedUrl;
        }

        String longUrl = url.getLongUrl();

        if (url.getExpiresAt() != null) {
            java.time.Duration ttl = java.time.Duration.between(java.time.LocalDateTime.now(java.time.ZoneOffset.UTC), url.getExpiresAt());
            if (!ttl.isNegative()) {
                redisTemplate.opsForValue().set(cacheKey, longUrl, ttl);
            }
        } else {
            redisTemplate.opsForValue().set(cacheKey, longUrl, java.time.Duration.ofHours(24));
        }

        return longUrl;
    }

    public String getUrlForUnlock(String shortUrl, String password) {
        var url = isExistsShortUrl(shortUrl);
        
        if (url.isQuarantined()) {
            throw new LinkQuarantinedException(shortUrl, url.getQuarantineReason());
        }

        if (!url.isActive()) {
            throw new LinkExpiredException();
        }
        
        if (url.getPasswordHash() == null || url.getPasswordHash().isEmpty()) {
            throw new IllegalArgumentException("URL is not password protected.");
        }
        
        if (!passwordEncoder.matches(password, url.getPasswordHash())) {
            throw new org.springframework.security.authentication.BadCredentialsException("Incorrect password");
        }
        
        return url.getLongUrl();
    }

    public UrlDto getUrl(String shortUrl) {
        var url = isExistsShortUrl(shortUrl);

        isUserCorrect(url);

        return toDtoWithClickCount(url);
    }

    public List<UrlDto> getAllUrls(String sortBy, Long tagId, Long folderId, String folderSlug, String search) {
        var sortByClickCount = sortBy.equals("accessed_times");

        if (sortByClickCount) {
            sortBy = "id";
        }

        if (!Set.of("id", "statistic.accessedTimes").contains(sortBy)) {
            sortBy = "id";
        }

        Long userId = getUserId();
        List<Url> unassignedUrls = urlRepository.findByUserIdAndFolderIsNull(userId);
        if (!unassignedUrls.isEmpty()) {
            folderRepository.findByNameIgnoreCaseAndUserId("Links", userId).ifPresent(linksFolder -> {
                unassignedUrls.forEach(url -> url.setFolder(linksFolder));
                urlRepository.saveAll(unassignedUrls);
            });
        }
        List<Url> urls = urlRepository.findAllByUserIdWithFilters(userId, tagId, folderId, folderSlug, search);
        urls.sort(Comparator.comparing(Url::getId).reversed());

        var dtos = urls.stream()
                .map(this::toDtoWithClickCountSafe)
                .filter(java.util.Objects::nonNull)
                .toList();

        if (sortByClickCount) {
            return dtos.stream()
                    .sorted(Comparator.comparing(UrlDto::getAccessed_times).reversed())
                    .toList();
        }

        return dtos;
    }

    private UrlDto toDtoWithClickCountSafe(Url url) {
        try {
            return toDtoWithClickCount(url);
        } catch (Exception e) {
            log.error("Failed to map URL id: {}", url.getId(), e);
            return null;
        }
    }

    /**
     * Builds a {@link UrlDto} whose {@code accessed_times} reflects live click data
     * from {@link ClickEventRepository}, keeping the dashboard in sync with analytics.
     */
    private UrlDto toDtoWithClickCount(Url url) {
        var dto = urlMapper.toDto(url);
        long clicks = clickEventRepository.countByUrl_Id(url.getId(), java.time.LocalDateTime.of(1970, 1, 1, 0, 0), null);

        dto.setShortUrl(rootDomainUrl + "/" + url.getShortUrl());

        return new UrlDto(
                dto.getId(),
                dto.getLongUrl(),
                dto.getShortUrl(),
                BigInteger.valueOf(clicks),
                dto.getCreatedAt(),
                dto.getUpdatedAt(),
                url.getExpiresAt(),
                url.isActive(),
                url.getPasswordHash() != null && !url.getPasswordHash().isEmpty(),
                dto.getTags(),
                url.getFolder() != null ? url.getFolder().getId() : null,
                url.getFolder() != null ? url.getFolder().getName() : null
        );
    }

    @CacheEvict(value = "urls", key = "#shortUrl")
    public UrlUpdateDto updateUrl(UrlRequest urlRequest, String shortUrl) {
        var url = isExistsShortUrl(shortUrl);

        isUserCorrect(url);

        if (urlRequest.getCustomAlias() != null && !urlRequest.getCustomAlias().trim().isEmpty()) {
            String alias = urlRequest.getCustomAlias().trim();
            if (!alias.matches("^[a-zA-Z0-9-_]+$")) {
                throw new IllegalArgumentException("Custom alias can only contain letters, numbers, hyphens, and underscores.");
            }
            if (!alias.equals(shortUrl) && urlRepository.existsUrlByShortUrl(alias)) {
                throw new AliasAlreadyExistsException();
            }
            url.setShortUrl(alias);
        }

        urlMapper.updateUrl(urlRequest, url);
        
        if (url.getExpiresAt() == null || url.getExpiresAt().isAfter(java.time.LocalDateTime.now(java.time.ZoneOffset.UTC))) {
            url.setActive(true);
        } else {
            url.setActive(false);
        }
        
        urlRepository.save(url);
        
        redisTemplate.delete("urls::" + url.getShortUrl());
        org.springframework.cache.Cache cache = cacheManager.getCache("urls");
        if (cache != null) {
            cache.evict(url.getShortUrl());
        }
        
        String cacheKey = "urls::" + url.getShortUrl();
        if (url.getExpiresAt() != null) {
            java.time.Duration ttl = java.time.Duration.between(java.time.LocalDateTime.now(java.time.ZoneOffset.UTC), url.getExpiresAt());
            if (!ttl.isNegative()) {
                redisTemplate.opsForValue().set(cacheKey, url.getLongUrl(), ttl);
            }
        } else {
            redisTemplate.opsForValue().set(cacheKey, url.getLongUrl(), java.time.Duration.ofHours(24));
        }

        var updateDto = urlMapper.toUpdateDto(url);
        updateDto.setShortUrl(rootDomainUrl + "/" + url.getShortUrl());
        return updateDto;
    }

    public UrlDto updateUrl(String hash, UrlUpdateRequestDto request, User currentUser) {
        if (currentUser.isSuspended()) {
            throw new org.springframework.security.access.AccessDeniedException("Your account has been suspended by an administrator.");
        }
        if (request.getLongUrl() != null && isDomainBlacklisted(request.getLongUrl())) {
            throw new IllegalArgumentException("The destination URL domain is blacklisted or prohibited on this instance.");
        }

        var url = isExistsShortUrl(hash);

        boolean isAdmin = currentUser.getRole() == com.url_shortener.url_shortener.users.Role.ROOT || currentUser.getRole() == com.url_shortener.url_shortener.users.Role.ADMIN;

        if (!isAdmin && !url.getUser().getId().equals(currentUser.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("You do not own this URL.");
        }

        if (request.getLongUrl() != null && !request.getLongUrl().trim().isEmpty()) {
            url.setLongUrl(request.getLongUrl().trim());
        }
        if (request.getPassword() != null) {
            if (request.getPassword().isEmpty()) {
                url.setPasswordHash(null);
            } else if (!request.getPassword().trim().isEmpty()) {
                url.setPasswordHash(passwordEncoder.encode(request.getPassword().trim()));
            }
        }
        url.setExpiresAt(request.getExpiresAt());
        if (request.getTagIds() != null) {
            List<Tag> tags = tagRepository.findAllById(request.getTagIds());
            for (Tag t : tags) {
                if (!isAdmin && !t.getUser().getId().equals(currentUser.getId())) {
                    throw new org.springframework.security.access.AccessDeniedException("You cannot assign a tag you do not own.");
                }
            }
            url.setTags(new java.util.HashSet<>(tags));
        }

        if (url.getExpiresAt() == null || url.getExpiresAt().isAfter(java.time.LocalDateTime.now(java.time.ZoneOffset.UTC))) {
            url.setActive(true);
        } else {
            url.setActive(false);
        }

        url = urlRepository.save(url);
        
        // CRITICAL CACHE INVALIDATION
        redisTemplate.delete("urls::" + url.getShortUrl());
        org.springframework.cache.Cache updateCache = cacheManager.getCache("urls");
        if (updateCache != null) {
            updateCache.evict(url.getShortUrl());
        }
        
        if (url.getExpiresAt() != null) {
            java.time.Duration ttl = java.time.Duration.between(java.time.LocalDateTime.now(java.time.ZoneOffset.UTC), url.getExpiresAt());
            if (!ttl.isNegative()) {
                redisTemplate.opsForValue().set("urls::" + url.getShortUrl(), url.getLongUrl(), ttl);
            }
        } else {
            redisTemplate.opsForValue().set("urls::" + url.getShortUrl(), url.getLongUrl(), java.time.Duration.ofHours(24));
        }

        return toDtoWithClickCount(url);
    }

    @CacheEvict(value = "urls", key = "#shortUrl")
    public void deleteUrl(String shortUrl) {
        var url = isExistsShortUrl(shortUrl);

        isUserCorrect(url);

        urlRepository.delete(url);
    }

    private static void isUserCorrect(Url url) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ROOT") || a.getAuthority().equals("ROOT"))) {
            return;
        }
        if (!(url.getUser().getId().equals(getUserId()))) {
            throw new UrlNotFoundException();
        }
    }

    private Url isExistsShortUrl(String shortUrl) {
        var url = urlRepository.findByShortUrl(shortUrl);
        if (url == null){
            throw new UrlNotFoundException();
        }
        
        if (url.isActive() && url.getExpiresAt() != null && url.getExpiresAt().isBefore(java.time.LocalDateTime.now(java.time.ZoneOffset.UTC))) {
            url.setActive(false);
            urlRepository.save(url);
            redisTemplate.delete("urls::" + url.getShortUrl());
        }
        
        return url;
    }

    @org.springframework.transaction.annotation.Transactional
    public BulkUrlActionResponseDto executeBulkAction(BulkUrlActionRequestDto request, User currentUser) {
        boolean isAdmin = currentUser.getRole() == com.url_shortener.url_shortener.users.Role.ROOT || currentUser.getRole() == com.url_shortener.url_shortener.users.Role.ADMIN;

        List<Url> urls = urlRepository.findAllByShortUrlIn(request.getHashes());
        if (urls.isEmpty()) {
            return new BulkUrlActionResponseDto(true, 0, "No matching links found.");
        }

        // Verify ownership
        for (Url url : urls) {
            if (!isAdmin && !url.getUser().getId().equals(currentUser.getId())) {
                throw new org.springframework.security.access.AccessDeniedException("You do not own all of the selected URLs.");
            }
        }

        String action = request.getAction().toUpperCase();
        int affected = 0;

        switch (action) {
            case "MOVE_FOLDER":
                Folder folder = null;
                if (request.getFolderId() != null) {
                    folder = folderRepository.findById(request.getFolderId())
                            .orElseThrow(() -> new IllegalArgumentException("Folder not found"));
                    if (!isAdmin && !folder.getUser().getId().equals(currentUser.getId())) {
                        throw new org.springframework.security.access.AccessDeniedException("You do not own this folder.");
                    }
                }
                for (Url url : urls) {
                    url.setFolder(folder);
                }
                urlRepository.saveAll(urls);
                affected = urls.size();
                break;

            case "ADD_TAGS":
                Set<Tag> tagsToAssign = new HashSet<>();
                if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
                    List<Tag> tags = tagRepository.findAllById(request.getTagIds());
                    for (Tag t : tags) {
                        if (!isAdmin && !t.getUser().getId().equals(currentUser.getId())) {
                            throw new org.springframework.security.access.AccessDeniedException("You cannot assign a tag you do not own.");
                        }
                    }
                    tagsToAssign.addAll(tags);
                }
                for (Url url : urls) {
                    url.setTags(new HashSet<>(tagsToAssign));
                }
                urlRepository.saveAll(urls);
                affected = urls.size();
                break;

            case "SET_EXPIRATION":
                for (Url url : urls) {
                    url.setExpiresAt(request.getExpiresAt());
                    if (request.getExpiresAt() == null || request.getExpiresAt().isAfter(java.time.LocalDateTime.now(java.time.ZoneOffset.UTC))) {
                        url.setActive(true);
                    } else {
                        url.setActive(false);
                    }
                    redisTemplate.delete("urls::" + url.getShortUrl());
                    org.springframework.cache.Cache cache = cacheManager.getCache("urls");
                    if (cache != null) {
                        cache.evict(url.getShortUrl());
                    }
                }
                urlRepository.saveAll(urls);
                affected = urls.size();
                break;

            case "TOGGLE_STATUS":
                boolean newActive = request.getDisabled() == null || !request.getDisabled();
                for (Url url : urls) {
                    url.setActive(newActive);
                    redisTemplate.delete("urls::" + url.getShortUrl());
                    org.springframework.cache.Cache cache = cacheManager.getCache("urls");
                    if (cache != null) {
                        cache.evict(url.getShortUrl());
                    }
                }
                urlRepository.saveAll(urls);
                affected = urls.size();
                break;

            case "DELETE":
                for (Url url : urls) {
                    redisTemplate.delete("urls::" + url.getShortUrl());
                    org.springframework.cache.Cache cache = cacheManager.getCache("urls");
                    if (cache != null) {
                        cache.evict(url.getShortUrl());
                    }
                }
                urlRepository.deleteAll(urls);
                affected = urls.size();
                break;

            default:
                throw new IllegalArgumentException("Unknown bulk action: " + action);
        }

        return new BulkUrlActionResponseDto(true, affected, "Successfully performed " + action + " on " + affected + " links.");
    }

    public boolean isDomainBlacklisted(String longUrl) {
        if (longUrl == null || longUrl.isBlank()) return false;
        try {
            java.net.URI uri = new java.net.URI(longUrl);
            String host = uri.getHost();
            if (host == null) return false;
            host = host.toLowerCase();

            if (rootDomainUrl != null && !rootDomainUrl.isBlank()) {
                try {
                    String rootHost = new java.net.URI(rootDomainUrl).getHost();
                    if (rootHost != null && (host.equalsIgnoreCase(rootHost) || host.endsWith("." + rootHost))) {
                        return true;
                    }
                } catch (Exception ignored) {}
            }

            var blacklist = blacklistedDomainRepository.findAll();
            for (var b : blacklist) {
                String pattern = b.getDomainPattern().toLowerCase().trim();
                if (pattern.startsWith("*.")) {
                    String root = pattern.substring(2);
                    if (host.equals(root) || host.endsWith("." + root)) return true;
                } else if (host.equals(pattern) || host.endsWith("." + pattern)) {
                    return true;
                }
            }
        } catch (Exception e) {
            // invalid URL
        }
        return false;
    }

    private static Long getUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        return (Long) authentication.getPrincipal();
    }
}
