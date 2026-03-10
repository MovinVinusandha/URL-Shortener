package com.url_shortener.url_shortener.users;

import com.url_shortener.url_shortener.common.SecurityRules;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;
import org.springframework.stereotype.Component;

@Component
public class UserSecurityRules implements SecurityRules {
    @Override
    public void configure(AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry registry) {
        registry.requestMatchers(HttpMethod.POST, "/user").permitAll()
                .requestMatchers(HttpMethod.GET, "/user/all").hasAnyRole(Role.ROOT.name(), Role.ADMIN.name());
    }
}
