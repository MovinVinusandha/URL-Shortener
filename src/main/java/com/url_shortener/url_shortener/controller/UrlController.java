package com.url_shortener.url_shortener.controller;

import com.url_shortener.url_shortener.dtos.UrlDto;
import com.url_shortener.url_shortener.dtos.UrlRequest;
import com.url_shortener.url_shortener.entities.Statistic;
import com.url_shortener.url_shortener.entities.Url;
import com.url_shortener.url_shortener.mappers.UrlMapper;
import com.url_shortener.url_shortener.repositories.StatisticRepository;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@AllArgsConstructor
public class UrlController {

    private final UrlMapper urlMapper;
    private final StatisticRepository statisticRepository;

    @PostMapping("/shorten")
    public ResponseEntity<UrlDto> generateShortUrl(@RequestBody UrlRequest urlRequest) {

        String shortUrl = urlRequest.getLongUrl() + " short (this is demo)";

        var url = Url.builder()
                .longUrl(urlRequest.getLongUrl())
                .shortUrl(shortUrl)
                .build();

        var stat = Statistic.builder()
                .urls(url)
                .accessedTimes(0L)
                .build();

        statisticRepository.save(stat);

        return ResponseEntity.ok(urlMapper.toDto(url));
    }
}
