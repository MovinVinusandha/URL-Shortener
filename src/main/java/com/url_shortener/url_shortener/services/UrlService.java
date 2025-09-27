package com.url_shortener.url_shortener.services;

import com.url_shortener.url_shortener.dtos.UrlDto;
import com.url_shortener.url_shortener.dtos.UrlRequest;
import com.url_shortener.url_shortener.entities.Statistic;
import com.url_shortener.url_shortener.entities.Url;
import com.url_shortener.url_shortener.exception.UrlExistInDataBaseException;
import com.url_shortener.url_shortener.exception.UrlNotFoundException;
import com.url_shortener.url_shortener.mappers.UrlMapper;
import com.url_shortener.url_shortener.repositories.UrlRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.zip.CRC32;

@Service
@AllArgsConstructor
public class UrlService {
    private final UrlMapper urlMapper;
    private final UrlRepository urlRepository;

    public UrlDto generateShortUrl(UrlRequest urlRequest) {
        String shortUrl = "https://localhost/" + generateUrlHash(urlRequest.getLongUrl());

        if (!(urlRepository.findByShortUrl(shortUrl) == null)) {
           throw new UrlExistInDataBaseException();
        }

        var url = urlMapper.toEntity(urlRequest);
        url.setShortUrl(shortUrl);

        var stat = Statistic.builder()
                .accessedTimes(0L)
                .urls(url)
                .build();

        url.addStatistic(stat);

        urlRepository.save(url);
        return urlMapper.toDto(url);
    }

    public String generateUrlHash(String data){
        CRC32 CRC32 = new CRC32();
        CRC32.update(data.getBytes());
        return String.format(Locale.US,"%08X", CRC32.getValue());
    }

    public Url urlRedirect(String shortUrl) {
        var url = urlRepository.findByShortUrl("https://localhost/" + shortUrl);
        if (url == null){
            throw new UrlNotFoundException();
        }

        url.getStatistic().setAccessedTimes(url.getStatistic().getAccessedTimes() + 1);
        urlRepository.save(url);

        return url;
    }
}
