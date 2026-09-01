package com.url_shortener.url_shortener.config;

import org.apache.coyote.http11.AbstractHttp11Protocol;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
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
     */
    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
                .connectTimeout(Duration.ofSeconds(3))
                .readTimeout(Duration.ofSeconds(5))
                .build();
    }

    /**
     * Customize embedded Tomcat connector to accept large request headers and cookies (up to 2MB).
     */
    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> tomcatCustomizer() {
        return factory -> factory.addConnectorCustomizers(connector -> {
            if (connector.getProtocolHandler() instanceof AbstractHttp11Protocol<?> protocolHandler) {
                protocolHandler.setMaxHttpHeaderSize(2 * 1024 * 1024); // 2 MB
                protocolHandler.setMaxSavePostSize(2 * 1024 * 1024);
            }
        });
    }
}
