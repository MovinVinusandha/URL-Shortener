package com.url_shortener.url_shortener.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class BlockedIpFilter extends OncePerRequestFilter {

    private final BlockedIpService blockedIpService;
    private final SecurityIncidentRepository incidentRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String path = request.getRequestURI();

        // Exempt health checks, Swagger, and admin management endpoints to prevent admin lockouts
        if (path.startsWith("/api/health") || path.startsWith("/health") || path.startsWith("/admin/") || path.startsWith("/v3/api-docs") || path.startsWith("/swagger-ui")) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = resolveClientIp(request);

        if (blockedIpService.isIpBlocked(clientIp)) {
            log.warn("Blocked request from blacklisted IP {} targeting {}", clientIp, path);

            // Log security incident attempt
            try {
                SecurityIncident incident = SecurityIncident.builder()
                        .incidentType("BLOCKED_IP_ATTEMPT")
                        .severity("MEDIUM")
                        .clientIp(clientIp)
                        .targetUrl(path)
                        .details("Request rejected at perimeter from blacklisted IP address / subnet")
                        .isResolved(false)
                        .build();
                incidentRepository.save(incident);
            } catch (Exception e) {
                log.error("Failed to log blocked IP incident: {}", e.getMessage());
            }

            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getWriter(), Map.of(
                    "status", 403,
                    "error", "Forbidden",
                    "message", "Access denied: Your IP address is blocked by platform security policy."
            ));
            return;
        }

        filterChain.doFilter(request, response);
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
