package com.url_shortener.url_shortener.admin;

import com.url_shortener.url_shortener.common.SecurityRules;
import com.url_shortener.url_shortener.users.Role;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;
import org.springframework.stereotype.Component;

@Component
public class AdminSecurityRules implements SecurityRules {
    @Override
    public void configure(AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry registry) {
        registry.requestMatchers("/admin/**").hasAnyRole(Role.ROOT.name(), Role.ADMIN.name());
    }
}
