package com.url_shortener.url_shortener.urls;

import com.url_shortener.url_shortener.common.SecurityRules;
import com.url_shortener.url_shortener.users.Role;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;
import org.springframework.stereotype.Component;

@Component
public class UrlSecurityRules implements SecurityRules {
    @Override
    public void configure(AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry registry) {
        registry.requestMatchers("/{hash:[a-zA-Z0-9]+}").permitAll()
                .requestMatchers("/shorten").permitAll()
                .requestMatchers(HttpMethod.GET, "/url/all").hasAnyRole(Role.ROOT.name(), Role.ADMIN.name());
    }
}
