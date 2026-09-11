package com.url_shortener.url_shortener.analytics;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for {@link ClickEvent} persistence and analytics queries.
 */
@Repository
public interface ClickEventRepository extends JpaRepository<ClickEvent, Long> {

    /** All click events for a specific URL, newest first. */
    List<ClickEvent> findByUrl_IdOrderByTimestampDesc(Long urlId);

    /** Paginated click events for a URL (for large datasets). */
    Page<ClickEvent> findByUrl_Id(Long urlId, Pageable pageable);

    /** Total click count for a specific URL. */
    long countByUrl_Id(Long urlId);

    @Query("SELECT COUNT(c) FROM ClickEvent c WHERE c.url.id IN (SELECT u.id FROM Url u WHERE u.user.id = :userId)")
    long countTotalClicksByUserId(@Param("userId") Long userId);

    @Query("""
            SELECT COUNT(c) FROM ClickEvent c 
            WHERE c.url.id = :urlId 
              AND c.timestamp >= :startDate 
              AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            """)
    long countByUrl_Id(@Param("urlId") Long urlId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    default long countByUrl_Id(Long urlId, LocalDateTime startDate, LocalDateTime endDate) {
        return countByUrl_Id(urlId, startDate, endDate, null, null, null, null, null, null);
    }

    /** Click events for a URL within a time range (for time-series charts). */
    List<ClickEvent> findByUrl_IdAndTimestampBetween(
            Long urlId,
            LocalDateTime from,
            LocalDateTime to
    );

    /** Count clicks grouped by device class for a URL. */
    @Query("""
            SELECT c.device, COUNT(c) AS cnt
            FROM ClickEvent c
            WHERE c.url.id = :urlId AND c.timestamp >= :startDate AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.device
            ORDER BY cnt DESC
            """)
    List<Object[]> countByDeviceForUrl(@Param("urlId") Long urlId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    /** Count clicks grouped by browser for a URL. */
    @Query("""
            SELECT c.browser, COUNT(c) AS cnt
            FROM ClickEvent c
            WHERE c.url.id = :urlId AND c.timestamp >= :startDate AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.browser
            ORDER BY cnt DESC
            """)
    List<Object[]> countByBrowserForUrl(@Param("urlId") Long urlId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    /** Count clicks grouped by country for a URL. */
    @Query("""
            SELECT c.country, COUNT(c) AS cnt
            FROM ClickEvent c
            WHERE c.url.id = :urlId AND c.timestamp >= :startDate AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.country
            ORDER BY cnt DESC
            """)
    List<Object[]> countByCountryForUrl(@Param("urlId") Long urlId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    /** Count clicks grouped by OS for a URL. */
    @Query("""
            SELECT c.os, COUNT(c) AS cnt
            FROM ClickEvent c
            WHERE c.url.id = :urlId AND c.timestamp >= :startDate AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.os
            ORDER BY cnt DESC
            """)
    List<Object[]> countByOsForUrl(@Param("urlId") Long urlId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    /** Count clicks grouped by date for a URL over a time range. */
    @Query("""
            SELECT CAST(c.timestamp AS date) as date, COUNT(c) as cnt
            FROM ClickEvent c
            WHERE c.url.id = :urlId AND c.timestamp >= :startDate AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY CAST(c.timestamp AS date)
            ORDER BY date ASC
            """)
    List<Object[]> countByDateForUrl(@Param("urlId") Long urlId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    /** Count clicks grouped by hour for a URL over a time range. */
    @Query("""
            SELECT FUNCTION('DATE_FORMAT', c.timestamp, '%Y-%m-%d %H:00:00') as date, COUNT(c) as cnt
            FROM ClickEvent c
            WHERE c.url.id = :urlId AND c.timestamp >= :startDate AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY FUNCTION('DATE_FORMAT', c.timestamp, '%Y-%m-%d %H:00:00')
            ORDER BY date ASC
            """)
    List<Object[]> countByHourForUrl(@Param("urlId") Long urlId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    // ── UTM QUERIES FOR A SPECIFIC URL ──────────────────────────────────────

    @Query("""
            SELECT c.utmSource, COUNT(c) AS cnt
            FROM ClickEvent c
            WHERE c.url.id = :urlId AND c.utmSource IS NOT NULL AND c.utmSource <> ''
              AND c.timestamp >= :startDate AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.utmSource
            ORDER BY cnt DESC
            """)
    List<Object[]> countByUtmSourceForUrl(@Param("urlId") Long urlId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT c.utmMedium, COUNT(c) AS cnt
            FROM ClickEvent c
            WHERE c.url.id = :urlId AND c.utmMedium IS NOT NULL AND c.utmMedium <> ''
              AND c.timestamp >= :startDate AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.utmMedium
            ORDER BY cnt DESC
            """)
    List<Object[]> countByUtmMediumForUrl(@Param("urlId") Long urlId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT c.utmCampaign, COUNT(c) AS cnt
            FROM ClickEvent c
            WHERE c.url.id = :urlId AND c.utmCampaign IS NOT NULL AND c.utmCampaign <> ''
              AND c.timestamp >= :startDate AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.utmCampaign
            ORDER BY cnt DESC
            """)
    List<Object[]> countByUtmCampaignForUrl(@Param("urlId") Long urlId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT c.utmTerm, COUNT(c) AS cnt
            FROM ClickEvent c
            WHERE c.url.id = :urlId AND c.utmTerm IS NOT NULL AND c.utmTerm <> ''
              AND c.timestamp >= :startDate AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.utmTerm
            ORDER BY cnt DESC
            """)
    List<Object[]> countByUtmTermForUrl(@Param("urlId") Long urlId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT c.utmContent, COUNT(c) AS cnt
            FROM ClickEvent c
            WHERE c.url.id = :urlId AND c.utmContent IS NOT NULL AND c.utmContent <> ''
              AND c.timestamp >= :startDate AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.utmContent
            ORDER BY cnt DESC
            """)
    List<Object[]> countByUtmContentForUrl(@Param("urlId") Long urlId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT c.referer, COUNT(c) AS cnt
            FROM ClickEvent c
            WHERE c.url.id = :urlId AND c.referer IS NOT NULL AND c.referer <> ''
              AND c.timestamp >= :startDate AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.referer
            ORDER BY cnt DESC
            """)
    List<Object[]> countByRefererForUrl(@Param("urlId") Long urlId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    /** Total click count across ALL URLs (admin overview). */
    @Query("SELECT COUNT(c) FROM ClickEvent c")
    long countAllClicks();

    long countByTimestampAfter(LocalDateTime timestamp);

    // ── OVERALL ANALYTICS QUERIES (User specific) ───────────────────────────

    @Query("""
            SELECT CAST(c.timestamp AS date) as date, COUNT(c) as cnt
            FROM ClickEvent c JOIN c.url u
            WHERE u.user.id = :userId
              AND (:startDate IS NULL OR c.timestamp >= :startDate)
              AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:hash IS NULL OR u.shortUrl = :hash OR u.shortUrl LIKE CONCAT('%/', :hash))
              AND (:tagIds IS NULL OR EXISTS (SELECT 1 FROM u.tags t WHERE t.id IN :tagIds))
              AND (:folderId IS NULL OR u.folder.id = :folderId)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY CAST(c.timestamp AS date)
            ORDER BY date ASC
            """)
    List<Object[]> countOverallClicksByDate(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("hash") String hash, @Param("tagIds") java.util.List<Long> tagIds, @Param("folderId") Long folderId, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT FUNCTION('DATE_FORMAT', c.timestamp, '%Y-%m-%d %H:00:00') as date, COUNT(c) as cnt
            FROM ClickEvent c JOIN c.url u
            WHERE u.user.id = :userId
              AND (:startDate IS NULL OR c.timestamp >= :startDate)
              AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:hash IS NULL OR u.shortUrl = :hash OR u.shortUrl LIKE CONCAT('%/', :hash))
              AND (:tagIds IS NULL OR EXISTS (SELECT 1 FROM u.tags t WHERE t.id IN :tagIds))
              AND (:folderId IS NULL OR u.folder.id = :folderId)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY FUNCTION('DATE_FORMAT', c.timestamp, '%Y-%m-%d %H:00:00')
            ORDER BY date ASC
            """)
    List<Object[]> countOverallClicksByHour(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("hash") String hash, @Param("tagIds") java.util.List<Long> tagIds, @Param("folderId") Long folderId, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT c.country, COUNT(c) AS cnt
            FROM ClickEvent c JOIN c.url u
            WHERE u.user.id = :userId
              AND (:startDate IS NULL OR c.timestamp >= :startDate)
              AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:hash IS NULL OR u.shortUrl = :hash OR u.shortUrl LIKE CONCAT('%/', :hash))
              AND (:tagIds IS NULL OR EXISTS (SELECT 1 FROM u.tags t WHERE t.id IN :tagIds))
              AND (:folderId IS NULL OR u.folder.id = :folderId)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.country
            ORDER BY cnt DESC
            """)
    List<Object[]> countOverallClicksByCountry(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("hash") String hash, @Param("tagIds") java.util.List<Long> tagIds, @Param("folderId") Long folderId, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT c.device, COUNT(c) AS cnt
            FROM ClickEvent c JOIN c.url u
            WHERE u.user.id = :userId
              AND (:startDate IS NULL OR c.timestamp >= :startDate)
              AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:hash IS NULL OR u.shortUrl = :hash OR u.shortUrl LIKE CONCAT('%/', :hash))
              AND (:tagIds IS NULL OR EXISTS (SELECT 1 FROM u.tags t WHERE t.id IN :tagIds))
              AND (:folderId IS NULL OR u.folder.id = :folderId)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.device
            ORDER BY cnt DESC
            """)
    List<Object[]> countOverallClicksByDevice(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("hash") String hash, @Param("tagIds") java.util.List<Long> tagIds, @Param("folderId") Long folderId, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT c.browser, COUNT(c) AS cnt
            FROM ClickEvent c JOIN c.url u
            WHERE u.user.id = :userId
              AND (:startDate IS NULL OR c.timestamp >= :startDate)
              AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:hash IS NULL OR u.shortUrl = :hash OR u.shortUrl LIKE CONCAT('%/', :hash))
              AND (:tagIds IS NULL OR EXISTS (SELECT 1 FROM u.tags t WHERE t.id IN :tagIds))
              AND (:folderId IS NULL OR u.folder.id = :folderId)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.browser
            ORDER BY cnt DESC
            """)
    List<Object[]> countOverallClicksByBrowser(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("hash") String hash, @Param("tagIds") java.util.List<Long> tagIds, @Param("folderId") Long folderId, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT c.utmSource, COUNT(c) AS cnt
            FROM ClickEvent c JOIN c.url u
            WHERE u.user.id = :userId
              AND c.utmSource IS NOT NULL AND c.utmSource <> ''
              AND (:startDate IS NULL OR c.timestamp >= :startDate)
              AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:hash IS NULL OR u.shortUrl = :hash OR u.shortUrl LIKE CONCAT('%/', :hash))
              AND (:tagIds IS NULL OR EXISTS (SELECT 1 FROM u.tags t WHERE t.id IN :tagIds))
              AND (:folderId IS NULL OR u.folder.id = :folderId)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.utmSource
            ORDER BY cnt DESC
            """)
    List<Object[]> countOverallClicksByUtmSource(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("hash") String hash, @Param("tagIds") java.util.List<Long> tagIds, @Param("folderId") Long folderId, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT c.utmMedium, COUNT(c) AS cnt
            FROM ClickEvent c JOIN c.url u
            WHERE u.user.id = :userId
              AND c.utmMedium IS NOT NULL AND c.utmMedium <> ''
              AND (:startDate IS NULL OR c.timestamp >= :startDate)
              AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:hash IS NULL OR u.shortUrl = :hash OR u.shortUrl LIKE CONCAT('%/', :hash))
              AND (:tagIds IS NULL OR EXISTS (SELECT 1 FROM u.tags t WHERE t.id IN :tagIds))
              AND (:folderId IS NULL OR u.folder.id = :folderId)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.utmMedium
            ORDER BY cnt DESC
            """)
    List<Object[]> countOverallClicksByUtmMedium(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("hash") String hash, @Param("tagIds") java.util.List<Long> tagIds, @Param("folderId") Long folderId, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT c.utmCampaign, COUNT(c) AS cnt
            FROM ClickEvent c JOIN c.url u
            WHERE u.user.id = :userId
              AND c.utmCampaign IS NOT NULL AND c.utmCampaign <> ''
              AND (:startDate IS NULL OR c.timestamp >= :startDate)
              AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:hash IS NULL OR u.shortUrl = :hash OR u.shortUrl LIKE CONCAT('%/', :hash))
              AND (:tagIds IS NULL OR EXISTS (SELECT 1 FROM u.tags t WHERE t.id IN :tagIds))
              AND (:folderId IS NULL OR u.folder.id = :folderId)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.utmCampaign
            ORDER BY cnt DESC
            """)
    List<Object[]> countOverallClicksByUtmCampaign(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("hash") String hash, @Param("tagIds") java.util.List<Long> tagIds, @Param("folderId") Long folderId, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT c.utmTerm, COUNT(c) AS cnt
            FROM ClickEvent c JOIN c.url u
            WHERE u.user.id = :userId
              AND c.utmTerm IS NOT NULL AND c.utmTerm <> ''
              AND (:startDate IS NULL OR c.timestamp >= :startDate)
              AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:hash IS NULL OR u.shortUrl = :hash OR u.shortUrl LIKE CONCAT('%/', :hash))
              AND (:tagIds IS NULL OR EXISTS (SELECT 1 FROM u.tags t WHERE t.id IN :tagIds))
              AND (:folderId IS NULL OR u.folder.id = :folderId)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.utmTerm
            ORDER BY cnt DESC
            """)
    List<Object[]> countOverallClicksByUtmTerm(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("hash") String hash, @Param("tagIds") java.util.List<Long> tagIds, @Param("folderId") Long folderId, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT c.utmContent, COUNT(c) AS cnt
            FROM ClickEvent c JOIN c.url u
            WHERE u.user.id = :userId
              AND c.utmContent IS NOT NULL AND c.utmContent <> ''
              AND (:startDate IS NULL OR c.timestamp >= :startDate)
              AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:hash IS NULL OR u.shortUrl = :hash OR u.shortUrl LIKE CONCAT('%/', :hash))
              AND (:tagIds IS NULL OR EXISTS (SELECT 1 FROM u.tags t WHERE t.id IN :tagIds))
              AND (:folderId IS NULL OR u.folder.id = :folderId)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.utmContent
            ORDER BY cnt DESC
            """)
    List<Object[]> countOverallClicksByUtmContent(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("hash") String hash, @Param("tagIds") java.util.List<Long> tagIds, @Param("folderId") Long folderId, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT c.referer, COUNT(c) AS cnt
            FROM ClickEvent c JOIN c.url u
            WHERE u.user.id = :userId
              AND c.referer IS NOT NULL AND c.referer <> ''
              AND (:startDate IS NULL OR c.timestamp >= :startDate)
              AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:hash IS NULL OR u.shortUrl = :hash OR u.shortUrl LIKE CONCAT('%/', :hash))
              AND (:tagIds IS NULL OR EXISTS (SELECT 1 FROM u.tags t WHERE t.id IN :tagIds))
              AND (:folderId IS NULL OR u.folder.id = :folderId)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.referer
            ORDER BY cnt DESC
            """)
    List<Object[]> countOverallClicksByReferer(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("hash") String hash, @Param("tagIds") java.util.List<Long> tagIds, @Param("folderId") Long folderId, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT COUNT(c)
            FROM ClickEvent c JOIN c.url u
            WHERE u.user.id = :userId
              AND (:startDate IS NULL OR c.timestamp >= :startDate)
              AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:hash IS NULL OR u.shortUrl = :hash OR u.shortUrl LIKE CONCAT('%/', :hash))
              AND (:tagIds IS NULL OR EXISTS (SELECT 1 FROM u.tags t WHERE t.id IN :tagIds))
              AND (:folderId IS NULL OR u.folder.id = :folderId)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            """)
    Long countTotalOverallClicks(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("hash") String hash, @Param("tagIds") java.util.List<Long> tagIds, @Param("folderId") Long folderId, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    // ── FOLDER ANALYTICS QUERIES (User specific) ───────────────────────────

    @Query("""
            SELECT CAST(c.timestamp AS date) as date, COUNT(c) as cnt
            FROM ClickEvent c
            WHERE c.url.id IN (SELECT u.id FROM Url u WHERE u.folder.id = :folderId AND u.user.id = :userId)
              AND c.timestamp >= :startDate AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY CAST(c.timestamp AS date)
            ORDER BY date ASC
            """)
    List<Object[]> countFolderClicksByDate(@Param("folderId") Long folderId, @Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT FUNCTION('DATE_FORMAT', c.timestamp, '%Y-%m-%d %H:00:00') as date, COUNT(c) as cnt
            FROM ClickEvent c
            WHERE c.url.id IN (SELECT u.id FROM Url u WHERE u.folder.id = :folderId AND u.user.id = :userId)
              AND c.timestamp >= :startDate AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY FUNCTION('DATE_FORMAT', c.timestamp, '%Y-%m-%d %H:00:00')
            ORDER BY date ASC
            """)
    List<Object[]> countFolderClicksByHour(@Param("folderId") Long folderId, @Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT c.country, COUNT(c) AS cnt
            FROM ClickEvent c
            WHERE c.url.id IN (SELECT u.id FROM Url u WHERE u.folder.id = :folderId AND u.user.id = :userId)
              AND c.timestamp >= :startDate AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.country
            ORDER BY cnt DESC
            """)
    List<Object[]> countFolderClicksByCountry(@Param("folderId") Long folderId, @Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT c.device, COUNT(c) AS cnt
            FROM ClickEvent c
            WHERE c.url.id IN (SELECT u.id FROM Url u WHERE u.folder.id = :folderId AND u.user.id = :userId)
              AND c.timestamp >= :startDate AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.device
            ORDER BY cnt DESC
            """)
    List<Object[]> countFolderClicksByDevice(@Param("folderId") Long folderId, @Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT c.browser, COUNT(c) AS cnt
            FROM ClickEvent c
            WHERE c.url.id IN (SELECT u.id FROM Url u WHERE u.folder.id = :folderId AND u.user.id = :userId)
              AND c.timestamp >= :startDate AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.browser
            ORDER BY cnt DESC
            """)
    List<Object[]> countFolderClicksByBrowser(@Param("folderId") Long folderId, @Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT c.utmSource, COUNT(c) AS cnt
            FROM ClickEvent c
            WHERE c.url.id IN (SELECT u.id FROM Url u WHERE u.folder.id = :folderId AND u.user.id = :userId)
              AND c.utmSource IS NOT NULL AND c.utmSource <> ''
              AND c.timestamp >= :startDate AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.utmSource
            ORDER BY cnt DESC
            """)
    List<Object[]> countFolderClicksByUtmSource(@Param("folderId") Long folderId, @Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT c.utmMedium, COUNT(c) AS cnt
            FROM ClickEvent c
            WHERE c.url.id IN (SELECT u.id FROM Url u WHERE u.folder.id = :folderId AND u.user.id = :userId)
              AND c.utmMedium IS NOT NULL AND c.utmMedium <> ''
              AND c.timestamp >= :startDate AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.utmMedium
            ORDER BY cnt DESC
            """)
    List<Object[]> countFolderClicksByUtmMedium(@Param("folderId") Long folderId, @Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT c.utmCampaign, COUNT(c) AS cnt
            FROM ClickEvent c
            WHERE c.url.id IN (SELECT u.id FROM Url u WHERE u.folder.id = :folderId AND u.user.id = :userId)
              AND c.utmCampaign IS NOT NULL AND c.utmCampaign <> ''
              AND c.timestamp >= :startDate AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.utmCampaign
            ORDER BY cnt DESC
            """)
    List<Object[]> countFolderClicksByUtmCampaign(@Param("folderId") Long folderId, @Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT c.utmTerm, COUNT(c) AS cnt
            FROM ClickEvent c
            WHERE c.url.id IN (SELECT u.id FROM Url u WHERE u.folder.id = :folderId AND u.user.id = :userId)
              AND c.utmTerm IS NOT NULL AND c.utmTerm <> ''
              AND c.timestamp >= :startDate AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.utmTerm
            ORDER BY cnt DESC
            """)
    List<Object[]> countFolderClicksByUtmTerm(@Param("folderId") Long folderId, @Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT c.utmContent, COUNT(c) AS cnt
            FROM ClickEvent c
            WHERE c.url.id IN (SELECT u.id FROM Url u WHERE u.folder.id = :folderId AND u.user.id = :userId)
              AND c.utmContent IS NOT NULL AND c.utmContent <> ''
              AND c.timestamp >= :startDate AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.utmContent
            ORDER BY cnt DESC
            """)
    List<Object[]> countFolderClicksByUtmContent(@Param("folderId") Long folderId, @Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT c.referer, COUNT(c) AS cnt
            FROM ClickEvent c
            WHERE c.url.id IN (SELECT u.id FROM Url u WHERE u.folder.id = :folderId AND u.user.id = :userId)
              AND c.referer IS NOT NULL AND c.referer <> ''
              AND c.timestamp >= :startDate AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            GROUP BY c.referer
            ORDER BY cnt DESC
            """)
    List<Object[]> countFolderClicksByReferer(@Param("folderId") Long folderId, @Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT COUNT(c) FROM ClickEvent c 
            WHERE c.url.id IN (SELECT u.id FROM Url u WHERE u.folder.id = :folderId AND u.user.id = :userId) 
              AND c.timestamp >= :startDate AND (:endDate IS NULL OR c.timestamp <= :endDate)
              AND (:utmSource IS NULL OR c.utmSource = :utmSource)
              AND (:utmMedium IS NULL OR c.utmMedium = :utmMedium)
              AND (:utmCampaign IS NULL OR c.utmCampaign = :utmCampaign)
              AND (:utmTerm IS NULL OR c.utmTerm = :utmTerm)
              AND (:utmContent IS NULL OR c.utmContent = :utmContent)
              AND (:referer IS NULL OR c.referer = :referer)
            """)
    Long countTotalFolderClicks(@Param("folderId") Long folderId, @Param("userId") Long userId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, @Param("utmSource") String utmSource, @Param("utmMedium") String utmMedium, @Param("utmCampaign") String utmCampaign, @Param("utmTerm") String utmTerm, @Param("utmContent") String utmContent, @Param("referer") String referer);

    @Query("""
            SELECT c FROM ClickEvent c
            WHERE c.url.user.id = :userId
               AND (:hash IS NULL OR c.url.shortUrl = :hash)
               AND (:country IS NULL OR LOWER(c.country) = LOWER(:country))
               AND (:city IS NULL OR LOWER(c.city) = LOWER(:city))
               AND (:device IS NULL OR LOWER(c.device) = LOWER(:device))
               AND (:browser IS NULL OR LOWER(c.browser) = LOWER(:browser))
               AND (:os IS NULL OR LOWER(c.os) = LOWER(:os))
               AND (:campaign IS NULL OR LOWER(c.utmCampaign) = LOWER(:campaign))
               AND (:search IS NULL OR (
                     LOWER(c.url.shortUrl) LIKE LOWER(CONCAT('%', :search, '%')) OR
                     LOWER(c.url.longUrl) LIKE LOWER(CONCAT('%', :search, '%')) OR
                     LOWER(c.city) LIKE LOWER(CONCAT('%', :search, '%')) OR
                     LOWER(c.country) LIKE LOWER(CONCAT('%', :search, '%')) OR
                     LOWER(c.referer) LIKE LOWER(CONCAT('%', :search, '%')) OR
                     LOWER(c.utmCampaign) LIKE LOWER(CONCAT('%', :search, '%'))
               ))
               AND (:startDate IS NULL OR c.timestamp >= :startDate)
               AND (:endDate IS NULL OR c.timestamp <= :endDate)
             ORDER BY c.timestamp DESC
             """)
    Page<ClickEvent> findEventsForUser(
            @Param("userId") Long userId,
            @Param("hash") String hash,
            @Param("country") String country,
            @Param("city") String city,
            @Param("device") String device,
            @Param("browser") String browser,
            @Param("os") String os,
            @Param("campaign") String campaign,
            @Param("search") String search,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable
    );

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM ClickEvent c WHERE c.url.id IN (SELECT u.id FROM Url u WHERE u.user.id = :userId)")
    void deleteByUserId(@Param("userId") Long userId);
}
