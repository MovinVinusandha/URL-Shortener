package com.url_shortener.url_shortener.analytics;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Set;

/**
 * Resolves a client IP address to geographic metadata using the ip-api.com API.
 * <p>
 * This service is intentionally fault-tolerant — every failure path returns
 * a safe fallback {@link GeoInfo} rather than propagating exceptions.
 * The caller (running on the async analytics thread pool) must never crash
 * due to an unavailable third-party service.
 */
@Service
@Slf4j
public class GeoLocationService {

    /**
     * Structured geographic result of an IP lookup.
     *
     * @param country   Full country name, or "Unknown" / "Local".
     * @param city      City name, or "Unknown" / "Local".
     * @param region    Region / state / province name, or "Unknown" / "Local".
     * @param continent Continent name, or "Unknown" / "Local".
     */
    public record GeoInfo(String country, String city, String region, String continent) {
        /** Returned when the IP is a private/loopback address. */
        static GeoInfo local() {
            return new GeoInfo("Local", "Local", "Local", "Local");
        }
        /** Returned on any API error or unresolvable IP. */
        static GeoInfo unknown() {
            return new GeoInfo("Unknown", "Unknown", "Unknown", "Unknown");
        }
    }

    private static final String GEO_API_URL =
            "http://ip-api.com/json/{ip}?fields=status,country,city,regionName,continent";

    /**
     * IP prefixes that indicate a private, loopback, or link-local address.
     * These will never resolve via an external GeoIP API.
     */
    private static final Set<String> PRIVATE_PREFIXES =
            Set.of("127.", "192.168.", "10.", "172.16.", "172.17.", "172.18.",
                   "172.19.", "172.2", "0:0:0:0:0:0:0:1", "::1");

    private final RestTemplate restTemplate;

    public GeoLocationService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Resolves the given IP address to geographic data.
     * <p>
     * Fallback hierarchy (top wins):
     * <ol>
     *   <li>Null/blank IP → {@link GeoInfo#unknown()}</li>
     *   <li>Private/loopback IP → {@link GeoInfo#local()}</li>
     *   <li>Network error or timeout → {@link GeoInfo#unknown()}</li>
     *   <li>API returns {@code status: "fail"} → {@link GeoInfo#unknown()}</li>
     *   <li>Any individual field null → that field defaults to {@code "Unknown"}</li>
     * </ol>
     *
     * @param ipAddress raw client IP address (IPv4 or IPv6)
     * @return a {@link GeoInfo} record; never null, never throws
     */
    public GeoInfo lookup(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) {
            log.debug("GeoIP skipped: null or blank IP");
            return GeoInfo.unknown();
        }

        if (isPrivateIp(ipAddress)) {
            log.debug("GeoIP skipped: private/loopback address [{}]", ipAddress);
            return GeoInfo.local();
        }

        try {
            GeoLocationResponse response = restTemplate.getForObject(
                    GEO_API_URL,
                    GeoLocationResponse.class,
                    ipAddress
            );

            if (response == null || !response.isSuccess()) {
                log.debug("GeoIP lookup returned non-success for IP [{}]: status={}",
                        ipAddress, response != null ? response.status() : "null");
                return GeoInfo.unknown();
            }

            return new GeoInfo(
                    valueOrUnknown(response.country()),
                    valueOrUnknown(response.city()),
                    valueOrUnknown(response.regionName()),
                    valueOrUnknown(response.continent())
            );

        } catch (Exception e) {
            // Network timeout, connection refused, JSON parse error, etc.
            log.warn("GeoIP lookup failed for IP [{}]: {}", ipAddress, e.getMessage());
            return GeoInfo.unknown();
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /** Returns {@code "Unknown"} for null or blank field values from the API. */
    private String valueOrUnknown(String value) {
        return (value == null || value.isBlank()) ? "Unknown" : value;
    }

    /** Returns true if the IP is a private, loopback, or link-local address. */
    private boolean isPrivateIp(String ip) {
        for (String prefix : PRIVATE_PREFIXES) {
            if (ip.startsWith(prefix)) return true;
        }
        return false;
    }
}
