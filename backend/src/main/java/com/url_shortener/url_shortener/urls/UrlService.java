package com.url_shortener.url_shortener.urls;

import com.url_shortener.url_shortener.statistics.Statistic;
import com.url_shortener.url_shortener.users.UserNotFoundException;
import com.url_shortener.url_shortener.users.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.zip.CRC32;

@Service
@AllArgsConstructor
public class UrlService {
    private final UrlMapper urlMapper;
    private final UrlRepository urlRepository;
    private final UserRepository userRepository;

    public UrlSend generateShortUrl(UrlRequest urlRequest) {
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

        urlMapper.toDto(url);
        return urlMapper.toDto(url);
    }

    public List<UrlDto> getAllUrls(String sortBy) {
        if (sortBy.equals("accessed_times")) {
            sortBy = "statistic.accessedTimes";
        }

        if (!Set.of( "id", "statistic.accessedTimes").contains(sortBy))
            sortBy = "id";

        return urlRepository.findAll(Sort.by(sortBy).descending())
                .stream()
                .map(urlMapper::toDto)
                .toList();
    }

    public UrlUpdateDto updateUrl(UrlRequest urlRequest, String shortUrl) {
        var url = isExistsShortUrl(shortUrl);

        isUserCorrect(url);

        urlMapper.updateUrl(urlRequest, url);
        urlRepository.save(url);

        return urlMapper.toUpdateDto(url);
    }

    public void deleteUrl(String shortUrl) {
        var url = isExistsShortUrl(shortUrl);

        isUserCorrect(url);

        urlRepository.delete(url);
    }

    private static void isUserCorrect(Url url) {
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
