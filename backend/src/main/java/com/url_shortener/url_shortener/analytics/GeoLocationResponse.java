package com.url_shortener.url_shortener.analytics;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * DTO mapping the JSON response from the {@code ip-api.com} geolocation API.
 * <p>
 * API endpoint: {@code http://ip-api.com/json/{ip}?fields=status,country,city,regionName,continent}
 * <p>
 * {@code @JsonIgnoreProperties(ignoreUnknown = true)} ensures deserialization
 * does not fail if the API adds new fields in a future version.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record GeoLocationResponse(

        /**
         * API result indicator. {@code "success"} on a valid IP lookup,
         * {@code "fail"} when the IP is private, reserved, or unrecognized.
         */
        String status,

        /** Full country name (e.g., "Sri Lanka", "United States"). */
        String country,

        /** City name (e.g., "Colombo", "Mountain View"). */
        String city,

        /**
         * Full region / state / province name (e.g., "Western Province", "California").
         * Note: the JSON key is {@code regionName}, not {@code region}.
         */
        @JsonProperty("regionName")
        String regionName,

        /** Continent name (e.g., "Asia", "North America", "Europe"). */
        String continent
) {
    /** Returns true only when the API reports a successful lookup. */
    public boolean isSuccess() {
        return "success".equalsIgnoreCase(status);
    }
}
