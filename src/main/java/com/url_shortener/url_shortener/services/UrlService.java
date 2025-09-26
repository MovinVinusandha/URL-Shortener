package com.url_shortener.url_shortener.services;

import com.url_shortener.url_shortener.dtos.UrlDto;
import com.url_shortener.url_shortener.entities.Statistic;
import com.url_shortener.url_shortener.entities.Url;
import com.url_shortener.url_shortener.mappers.UrlMapper;
import com.url_shortener.url_shortener.repositories.StatisticRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class UrlService {
    private final UrlMapper urlMapper;
    private StatisticRepository statisticRepository;

    public UrlDto generateShortUrl(String longUrl) {
        String shortUrl = longUrl + " short (this is demo)";

        var url = Url.builder()
                .longUrl(longUrl)
                .shortUrl(shortUrl)
                .build();

        var stat = Statistic.builder()
                .urls(url)
                .accessedTimes(0L)
                .build();

        statisticRepository.save(stat);

        return urlMapper.toDto(url);
    }
}
