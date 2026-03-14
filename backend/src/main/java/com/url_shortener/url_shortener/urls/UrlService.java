package com.url_shortener.url_shortener.urls;

import com.url_shortener.url_shortener.analytics.ClickEventRepository;
import com.url_shortener.url_shortener.statistics.Statistic;
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
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.zip.CRC32;

import org.springframework.security.access.AccessDeniedException;

@Service
@AllArgsConstructor
public class UrlService {
    private final UrlMapper urlMapper;
    private final UrlRepository urlRepository;
    private final UserRepository userRepository;
    private final ClickEventRepository clickEventRepository;

    public UrlSend generateShortUrl(UrlRequest urlRequest) {
        var authForCheck = SecurityContextHolder.getContext().getAuthentication();
        if (authForCheck != null && authForCheck.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ROOT") || a.getAuthority().equals("ROOT"))) {
            throw new AccessDeniedException("Admins cannot create short links.");
        }
        String shortUrl = generateUrlHash(urlRequest.getLongUrl());
        if (urlRepository.existsUrlByShortUrl(shortUrl)) {
            throw new UrlExistInDataBaseException();
        }
        var url = urlMapper.toEntity(urlRequest);
        url.setShortUrl(shortUrl);

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

        var stat = Statistic.builder()
                .accessedTimes(0L)
                .urls(url)
                .build();

        url.addStatistic(stat);

        urlRepository.save(url);
        return urlMapper.toSendDto(url);
    }

    public String generateUrlHash(String data){
        CRC32 CRC32 = new CRC32();
        CRC32.update(data.getBytes());
        return String.format(Locale.US,"%08X", CRC32.getValue());
    }

    @Cacheable(value = "urls", key = "#shortUrl")
    public String getLongUrlForRedirect(String shortUrl) {
        return isExistsShortUrl(shortUrl).getLongUrl();
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

        var dtos = urlRepository.findAll(Sort.by(sortBy).descending())
                .stream()
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
        long clicks = clickEventRepository.countByUrl_Id(url.getId());

        return new UrlDto(
                dto.getId(),
                dto.getLongUrl(),
                dto.getShortUrl(),
                BigInteger.valueOf(clicks),
                dto.getCreatedAt(),
                dto.getUpdatedAt()
        );
    }

    @CacheEvict(value = "urls", key = "#shortUrl")
    public UrlUpdateDto updateUrl(UrlRequest urlRequest, String shortUrl) {
        var url = isExistsShortUrl(shortUrl);

        isUserCorrect(url);

        urlMapper.updateUrl(urlRequest, url);
        urlRepository.save(url);

        return urlMapper.toUpdateDto(url);
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

        return url;
    }

    private static Long getUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        return (Long) authentication.getPrincipal();
    }
}
