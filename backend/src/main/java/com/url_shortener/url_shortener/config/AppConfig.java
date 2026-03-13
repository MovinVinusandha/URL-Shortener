package com.url_shortener.url_shortener.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * General application bean configuration.
 */
@Configuration
public class AppConfig {

    /**
     * {@link RestTemplate} bean used by {@code GeoLocationService} to call ip-api.com.
     * <p>
     * Tight timeouts are critical: a slow external API call runs on the
     * {@code analyticsExecutor} thread pool, not the HTTP request thread,
     * but we still want to free up pool threads promptly on network issues.
     * <ul>
     *   <li>Connect timeout: 3 seconds — fail fast if the host is unreachable.</li>
     *   <li>Read timeout: 5 seconds — wait up to 5 s for the response body.</li>
     * </ul>
     */
    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
                .connectTimeout(Duration.ofSeconds(3))
                .readTimeout(Duration.ofSeconds(5))
                .build();
    }
}
