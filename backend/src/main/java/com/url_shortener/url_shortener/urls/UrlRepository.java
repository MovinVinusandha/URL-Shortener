package com.url_shortener.url_shortener.urls;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UrlRepository extends JpaRepository<Url, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<Url> {
    Url findByShortUrl(String url);

    boolean existsUrlByShortUrl(String shortUrl);

    java.util.List<Url> findByIsActiveTrueAndExpiresAtBefore(java.time.LocalDateTime now);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(u) FROM Url u JOIN u.tags t WHERE t.id = :tagId")
    int countByTagsId(@org.springframework.data.repository.query.Param("tagId") Long tagId);

    int countByFolderId(Long folderId);

    java.util.List<Url> findByUserId(Long userId);

    java.util.List<Url> findByUserIdAndFolderIsNull(Long userId);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT u FROM Url u LEFT JOIN FETCH u.tags t LEFT JOIN FETCH u.folder f WHERE u.user.id = :userId AND (:tagId IS NULL OR t.id = :tagId) AND (:folderId IS NULL OR f.id = :folderId) AND (:folderSlug IS NULL OR f.slug = :folderSlug) AND (:search IS NULL OR LOWER(u.longUrl) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.shortUrl) LIKE LOWER(CONCAT('%', :search, '%')))")
    java.util.List<Url> findAllByUserIdWithFilters(@org.springframework.data.repository.query.Param("userId") Long userId, @org.springframework.data.repository.query.Param("tagId") Long tagId, @org.springframework.data.repository.query.Param("folderId") Long folderId, @org.springframework.data.repository.query.Param("folderSlug") String folderSlug, @org.springframework.data.repository.query.Param("search") String search);

    java.util.List<Url> findAllByShortUrlIn(java.util.Collection<String> shortUrls);

    long countByUserId(Long userId);

    long countByIsQuarantinedTrue();

    long countByIsActiveFalse();

    long countByIsActiveTrueAndIsQuarantinedFalse();

    long countByCreatedAtAfter(java.time.LocalDateTime dateTime);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(u) FROM Url u WHERE u.statistic.accessedTimes >= :minClicks")
    long countByMinClicks(@org.springframework.data.repository.query.Param("minClicks") Long minClicks);

    org.springframework.data.domain.Page<Url> findByShortUrlContainingIgnoreCaseOrLongUrlContainingIgnoreCase(String shortUrl, String longUrl, org.springframework.data.domain.Pageable pageable);
}
