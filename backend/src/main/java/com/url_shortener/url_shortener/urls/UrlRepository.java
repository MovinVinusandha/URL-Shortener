package com.url_shortener.url_shortener.urls;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UrlRepository extends JpaRepository<Url, Long> {
    Url findByShortUrl(String url);

    boolean existsUrlByShortUrl(String shortUrl);

    java.util.List<Url> findByIsActiveTrueAndExpiresAtBefore(java.time.LocalDateTime now);
}
