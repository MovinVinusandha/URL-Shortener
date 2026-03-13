package com.url_shortener.url_shortener.analytics;

import lombok.extern.slf4j.Slf4j;
import nl.basjes.parse.useragent.UserAgent;
import nl.basjes.parse.useragent.UserAgentAnalyzer;
import org.springframework.stereotype.Service;

/**
 * Parses a raw HTTP User-Agent string into structured device metadata.
 * <p>
 * Uses the YAUAA (Yet Another UserAgent Analyzer) library which is initialized
 * once as a Spring singleton and shared safely across all threads.
 */
@Service
@Slf4j
public class UserAgentParserService {

    /**
     * Structured result of a User-Agent parse operation.
     *
     * @param device  Device class: Desktop, Mobile, Tablet, Bot, or Unknown.
     * @param browser Browser name: Chrome, Firefox, Safari, Edge, etc.
     * @param os      Operating system: Windows, macOS, Android, iOS, Linux, etc.
     */
    public record DeviceInfo(String device, String browser, String os) {
        /** Sentinel value returned when parsing is not possible. */
        static DeviceInfo unknown() {
            return new DeviceInfo("Unknown", "Unknown", "Unknown");
        }
    }

    private final UserAgentAnalyzer analyzer;

    public UserAgentParserService(UserAgentAnalyzer analyzer) {
        this.analyzer = analyzer;
    }

    /**
     * Parses the given User-Agent string and returns device, browser, and OS details.
     * <p>
     * This method never throws — any internal YAUAA error is caught and logged,
     * and {@link DeviceInfo#unknown()} is returned as a safe fallback.
     *
     * @param userAgentString the raw {@code User-Agent} header value
     * @return a {@link DeviceInfo} record; never null
     */
    public DeviceInfo parse(String userAgentString) {
        if (userAgentString == null || userAgentString.isBlank()) {
            log.debug("UA parse skipped: blank or null User-Agent string");
            return DeviceInfo.unknown();
        }

        try {
            UserAgent agent = analyzer.parse(userAgentString);

            String rawDevice = agent.getValue("DeviceClass");
            String browser   = agent.getValue("AgentName");
            String os        = agent.getValue("OperatingSystemName");

            return new DeviceInfo(
                    normalizeDevice(rawDevice),
                    normalizeField(browser),
                    normalizeField(os)
            );
        } catch (Exception e) {
            log.warn("UA parsing failed for string [{}]: {}", abbreviate(userAgentString), e.getMessage());
            return DeviceInfo.unknown();
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Normalizes YAUAA's raw DeviceClass into a clean, UI-friendly label.
     * <p>
     * YAUAA returns many device classes (Phone, Mobile, Tablet, Desktop, Robot,
     * Hacker, Anonymized, etc.). We normalize them into a small controlled set.
     */
    private String normalizeDevice(String rawDevice) {
        if (rawDevice == null) return "Unknown";

        return switch (rawDevice) {
            case "Desktop", "Laptop"                          -> "Desktop";
            case "Phone", "Mobile"                            -> "Mobile";
            case "Tablet"                                     -> "Tablet";
            case "Robot", "Robot Mobile", "Robot Tablet",
                 "Spy", "Hacker", "Anonymized"                -> "Bot";
            case "Unknown", "???"                             -> "Unknown";
            default                                           -> rawDevice; // pass through future YAUAA classes
        };
    }

    /**
     * Returns "Unknown" if YAUAA could not identify a field (returns "???" or null).
     */
    private String normalizeField(String value) {
        if (value == null || value.equals("???")) return "Unknown";
        return value;
    }

    /** Abbreviates a long UA string for safe log output. */
    private String abbreviate(String s) {
        if (s == null) return "null";
        return s.length() > 80 ? s.substring(0, 80) + "..." : s;
    }
}
