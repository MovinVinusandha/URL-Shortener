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
@AllArgsConstructor
@lombok.extern.slf4j.Slf4j
public class UrlService {
    private final UrlMapper urlMapper;
    private final UrlRepository urlRepository;
    private final UserRepository userRepository;
    private final ClickEventRepository clickEventRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final TagRepository tagRepository;
    private final FolderRepository folderRepository;

    public UrlSend generateShortUrl(UrlRequest urlRequest) {
        var authForCheck = SecurityContextHolder.getContext().getAuthentication();
        if (authForCheck != null && authForCheck.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ROOT") || a.getAuthority().equals("ROOT"))) {
            throw new AccessDeniedException("Admins cannot create short links.");
        }
        String shortUrl;
        if (urlRequest.getCustomAlias() != null && !urlRequest.getCustomAlias().trim().isEmpty()) {
            shortUrl = urlRequest.getCustomAlias().trim();
            if (!shortUrl.matches("^[a-zA-Z0-9-_]+$")) {
                throw new IllegalArgumentException("Invalid custom alias format. Only alphanumeric characters, hyphens, and underscores are allowed.");
            }
            if (urlRepository.existsUrlByShortUrl(shortUrl)) {
                throw new AliasAlreadyExistsException();
            }
        } else {
            shortUrl = generateUrlHash(urlRequest.getLongUrl());
            if (urlRepository.existsUrlByShortUrl(shortUrl)) {
                throw new UrlExistInDataBaseException();
            }
        }
        var url = urlMapper.toEntity(urlRequest);
        url.setShortUrl(shortUrl);
        
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

        if (urlRequest.getFolderId() != null) {
            if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
                throw new AccessDeniedException("You must be logged in to assign folders.");
            }
            Long userId = (Long) authentication.getPrincipal();
            Folder folder = folderRepository.findById(urlRequest.getFolderId())
                    .orElseThrow(FolderNotFoundException::new);
            
            if (!folder.getUser().getId().equals(userId)) {
                throw new AccessDeniedException("You cannot assign a folder you do not own.");
            }
            url.setFolder(folder);
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
        
        return urlMapper.toSendDto(url);
    }

    public String generateUrlHash(String data){
        CRC32 CRC32 = new CRC32();
        CRC32.update(data.getBytes());
        return String.format(Locale.US,"%08X", CRC32.getValue());
    }

    private final org.springframework.data.redis.core.StringRedisTemplate redisTemplate;

    public String getLongUrlForRedirect(String shortUrl) {
        // Enforce strict lazy evaluation first
        var url = isExistsShortUrl(shortUrl);
        
        if (!url.isActive()) {
            throw new LinkExpiredException();
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

    public List<UrlDto> getAllUrls(String sortBy) {
        var sortByClickCount = sortBy.equals("accessed_times");

        if (sortByClickCount) {
            sortBy = "id";
        }

        if (!Set.of("id", "statistic.accessedTimes").contains(sortBy)) {
            sortBy = "id";
        }

        var authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ROOT") || a.getAuthority().equals("ROOT"));

        List<Url> urls;
        if (isAdmin) {
            urls = urlRepository.findAll(Sort.by(sortBy).descending());
        } else {
            urls = urlRepository.findByUserId(getUserId());
            urls.sort(Comparator.comparing(Url::getId).reversed());
        }

        var dtos = urls.stream()
                .map(this::toDtoWithClickCount)
                .toList();

        if (sortByClickCount) {
            return dtos.stream()
                    .sorted(Comparator.comparing(UrlDto::getAccessed_times).reversed())
                    .toList();
        }

        return dtos;
    }

    /**
     * Builds a {@link UrlDto} whose {@code accessed_times} reflects live click data
     * from {@link ClickEventRepository}, keeping the dashboard in sync with analytics.
     */
    private UrlDto toDtoWithClickCount(Url url) {
        var dto = urlMapper.toDto(url);
        long clicks = clickEventRepository.countByUrl_Id(url.getId(), java.time.LocalDateTime.of(1970, 1, 1, 0, 0));

        return new UrlDto(
                dto.getId(),
                dto.getLongUrl(),
                dto.getShortUrl(),
                BigInteger.valueOf(clicks),
                dto.getCreatedAt(),
                dto.getUpdatedAt(),
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

        urlMapper.updateUrl(urlRequest, url);
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

        return urlMapper.toUpdateDto(url);
    }

    public UrlDto updateUrl(String hash, UrlUpdateRequestDto request, User currentUser) {
        var url = isExistsShortUrl(hash);

        boolean isAdmin = currentUser.getRole() == com.url_shortener.url_shortener.users.Role.ROOT || currentUser.getRole() == com.url_shortener.url_shortener.users.Role.ADMIN;

        if (!isAdmin && !url.getUser().getId().equals(currentUser.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("You do not own this URL.");
        }

        if (request.getLongUrl() != null && !request.getLongUrl().trim().isEmpty()) {
            url.setLongUrl(request.getLongUrl().trim());
        }
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            url.setPasswordHash(passwordEncoder.encode(request.getPassword().trim()));
        }
        if (request.getExpiresAt() != null) {
            url.setExpiresAt(request.getExpiresAt());
        }
        if (request.getTagIds() != null) {
            List<Tag> tags = tagRepository.findAllById(request.getTagIds());
            for (Tag t : tags) {
                if (!isAdmin && !t.getUser().getId().equals(currentUser.getId())) {
                    throw new org.springframework.security.access.AccessDeniedException("You cannot assign a tag you do not own.");
                }
            }
            url.setTags(new java.util.HashSet<>(tags));
        }

        url = urlRepository.save(url);
        
        // CRITICAL CACHE INVALIDATION
        redisTemplate.delete("urls::" + url.getShortUrl());
        
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

    private static Long getUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        return (Long) authentication.getPrincipal();
    }
}
