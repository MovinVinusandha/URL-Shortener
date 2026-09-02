package com.url_shortener.url_shortener.analytics;

import com.url_shortener.url_shortener.urls.Url;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Represents a single click event recorded when a short URL is accessed.
 * <p>
 * Each record stores enriched metadata parsed from the HTTP request:
 * - Device class, browser, and OS from the User-Agent header (via YAUAA)
 * - Geographic data from the client IP address
 * - UTM parameters and Referer
 * <p>
 * Persisted asynchronously on the {@code analyticsExecutor} thread pool
 * so redirect response time is never blocked by this write.
 */
@Entity
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Table(name = "click_events", indexes = {
        @Index(name = "idx_click_events_url_id", columnList = "url_id"),
        @Index(name = "idx_click_events_timestamp", columnList = "timestamp"),
        @Index(name = "idx_click_events_utm_source", columnList = "utm_source"),
        @Index(name = "idx_click_events_utm_medium", columnList = "utm_medium"),
        @Index(name = "idx_click_events_utm_campaign", columnList = "utm_campaign")
})
public class ClickEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    /**
     * The URL entity this click belongs to.
     * Uses LAZY loading — we never need full URL data when querying click events.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "url_id", nullable = false)
    private Url url;

    /** Timestamp when the click occurred (UTC). */
    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;

    // ── Device & Browser ─────────────────────────────────────────────────────

    /** Device class: Desktop, Mobile, Tablet, or Unknown. */
    @Column(name = "device", length = 30)
    private String device;

    /** Browser name: Chrome, Firefox, Safari, Edge, etc. */
    @Column(name = "browser", length = 50)
    private String browser;

    /** Operating system: Windows, macOS, Android, iOS, Linux, etc. */
    @Column(name = "os", length = 50)
    private String os;

    // ── Geography ─────────────────────────────────────────────────────────────

    /** ISO-3166 country name (e.g., "Sri Lanka", "United States"). */
    @Column(name = "country", length = 100)
    private String country;

    /** City name from GeoIP lookup (e.g., "Colombo"). */
    @Column(name = "city", length = 100)
    private String city;

    /** Region / state / province (e.g., "Western Province", "California"). */
    @Column(name = "region", length = 100)
    private String region;

    /** Continent name (e.g., "Asia", "Europe", "North America"). */
    @Column(name = "continent", length = 50)
    private String continent;

    // ── UTM Campaign Tracking ────────────────────────────────────────────────

    @Column(name = "utm_source", length = 150)
    private String utmSource;

    @Column(name = "utm_medium", length = 150)
    private String utmMedium;

    @Column(name = "utm_campaign", length = 150)
    private String utmCampaign;

    @Column(name = "utm_term", length = 150)
    private String utmTerm;

    @Column(name = "utm_content", length = 150)
    private String utmContent;

    @Column(name = "referer", length = 255)
    private String referer;

    // ── Network ───────────────────────────────────────────────────────────────

    /**
     * Hashed IP address (SHA-256 truncated) for internal analysis.
     * Raw IPs are never stored to avoid PII compliance issues.
     */
    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @PrePersist
    protected void onCreate() {
        if (this.timestamp == null) {
            this.timestamp = LocalDateTime.now();
        }
    }
}
