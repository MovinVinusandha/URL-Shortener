package com.url_shortener.url_shortener.config;

import nl.basjes.parse.useragent.UserAgentAnalyzer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring configuration for the YAUAA (Yet Another UserAgent Analyzer) library.
 * <p>
 * The analyzer is expensive to initialize (~1-2 seconds) as it loads a large ruleset,
 * but is fully thread-safe and designed to be used as a singleton.
 * Declaring it as a {@code @Bean} ensures it is built once at startup and
 * shared safely across all threads in the analytics executor pool.
 */
@Configuration
public class UserAgentConfig {

    /**
     * Creates and configures the YAUAA analyzer singleton.
     * <p>
     * We limit the parsed fields to only what we need ({@code DeviceClass},
     * {@code AgentName}, {@code OperatingSystemName}) — this significantly reduces
     * memory footprint and parse time compared to extracting all ~180+ fields.
     * The in-memory LRU cache of 10,000 entries ensures returning visitors
     * (who share the same UA string) are served from cache without re-parsing.
     *
     * @return a fully initialized, thread-safe {@link UserAgentAnalyzer}
     */
    @Bean
    public UserAgentAnalyzer userAgentAnalyzer() {
        return UserAgentAnalyzer.newBuilder()
                .withField("DeviceClass")
                .withField("AgentName")
                .withField("OperatingSystemName")
                .withCache(10_000)
                .hideMatcherLoadStats()
                .build();
    }
}
