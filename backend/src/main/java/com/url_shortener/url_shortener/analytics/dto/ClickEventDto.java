package com.url_shortener.url_shortener.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Detailed event payload representing a single click interaction,
 * suitable for real-time SSE streaming and paginated audit table display.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClickEventDto {

    private Long id;
    private Long urlId;
    private String shortUrlHash;
    private String originalUrl;
    private LocalDateTime timestamp;

    // Device & Client
    private String device;
    private String browser;
    private String os;

    // Geo
    private String country;
    private String city;
    private String region;
    private String continent;
    private Double latitude;
    private Double longitude;

    // UTM Attribution
    private String utmSource;
    private String utmMedium;
    private String utmCampaign;
    private String utmTerm;
    private String utmContent;

    // Referrer & Network
    private String referer;
    private String ipAddress;
}
