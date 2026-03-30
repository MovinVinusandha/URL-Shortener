package com.url_shortener.url_shortener.urls;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UrlRepository extends JpaRepository<Url, Long> {
    Url findByShortUrl(String url);

    boolean existsUrlByShortUrl(String shortUrl);

    java.util.List<Url> findByIsActiveTrueAndExpiresAtBefore(java.time.LocalDateTime now);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(u) FROM Url u JOIN u.tags t WHERE t.id = :tagId")
    int countByTagsId(@org.springframework.data.repository.query.Param("tagId") Long tagId);

    int countByFolderId(Long folderId);
}
