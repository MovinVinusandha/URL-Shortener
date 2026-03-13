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
            WHERE c.url.id = :urlId
            GROUP BY c.device
            ORDER BY cnt DESC
            """)
    List<Object[]> countByDeviceForUrl(@Param("urlId") Long urlId);

    /** Count clicks grouped by browser for a URL. */
    @Query("""
            SELECT c.browser, COUNT(c) AS cnt
            FROM ClickEvent c
            WHERE c.url.id = :urlId
            GROUP BY c.browser
            ORDER BY cnt DESC
            """)
    List<Object[]> countByBrowserForUrl(@Param("urlId") Long urlId);

    /** Count clicks grouped by country for a URL. */
    @Query("""
            SELECT c.country, COUNT(c) AS cnt
            FROM ClickEvent c
            WHERE c.url.id = :urlId
            GROUP BY c.country
            ORDER BY cnt DESC
            """)
    List<Object[]> countByCountryForUrl(@Param("urlId") Long urlId);

    /** Count clicks grouped by OS for a URL. */
    @Query("""
            SELECT c.os, COUNT(c) AS cnt
            FROM ClickEvent c
            WHERE c.url.id = :urlId
            GROUP BY c.os
            ORDER BY cnt DESC
            """)
    List<Object[]> countByOsForUrl(@Param("urlId") Long urlId);

    /** Total click count across ALL URLs (admin overview). */
    @Query("SELECT COUNT(c) FROM ClickEvent c")
    long countAllClicks();
}
