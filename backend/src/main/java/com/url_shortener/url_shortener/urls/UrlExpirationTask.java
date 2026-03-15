package com.url_shortener.url_shortener.urls;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@lombok.extern.slf4j.Slf4j
public class UrlExpirationTask {

    private final UrlRepository urlRepository;
    private final StringRedisTemplate redisTemplate;

    public UrlExpirationTask(UrlRepository urlRepository, StringRedisTemplate redisTemplate) {
        this.urlRepository = urlRepository;
        this.redisTemplate = redisTemplate;
    }

    @org.springframework.transaction.annotation.Transactional
    @Scheduled(fixedRate = 60000)
    public void sweepExpiredUrls() {
        log.info("Running Expiration Sweeper... Current server time: {}", LocalDateTime.now(java.time.ZoneOffset.UTC));
        var expiredUrls = urlRepository.findByIsActiveTrueAndExpiresAtBefore(LocalDateTime.now(java.time.ZoneOffset.UTC));
        log.info("Found {} expired URLs to deactivate.", expiredUrls.size());
        
        for (Url url : expiredUrls) {
            url.setActive(false);
            urlRepository.save(url);
            redisTemplate.delete("urls::" + url.getShortUrl());
        }
    }
}
