package com.url_shortener.url_shortener.repositories;

import com.url_shortener.url_shortener.entities.Url;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UrlRepository extends JpaRepository<Url, Long> {
    Url findByShortUrl(String url);

    boolean existsUrlByShortUrl(String shortUrl);
}
