package com.url_shortener.url_shortener.admin.audit;

import com.url_shortener.url_shortener.auth.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(100)
@RequiredArgsConstructor
public class AdminAuditFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        if (path.startsWith("/admin")) {
            Long actorId = null;
            String actorEmail = null;
            String actorRole = null;

            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                try {
                    var jwt = jwtService.parseToken(authHeader.substring(7));
                    if (jwt != null) {
                        actorId = jwt.getUserId();
                        actorEmail = jwt.getEmail();
                        actorRole = jwt.getRole() != null ? jwt.getRole().name() : null;
                    }
                } catch (Exception ignored) {
                }
            }

            String clientIp = resolveClientIp(request);

            AdminActorContext context = AdminActorContext.builder()
                    .actorId(actorId)
                    .actorEmail(actorEmail)
                    .actorRole(actorRole)
                    .actorIp(clientIp)
                    .build();

            AdminAuditContextHolder.setContext(context);
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            AdminAuditContextHolder.clear();
        }
    }

    private String resolveClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank()) {
            return xRealIp.trim();
        }
        return request.getRemoteAddr();
    }
}
