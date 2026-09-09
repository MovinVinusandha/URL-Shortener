package com.url_shortener.url_shortener.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@lombok.extern.slf4j.Slf4j
@Component
@AllArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final TokenRevocationService tokenRevocationService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        var authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            var token = authHeader.replace("Bearer ", "");
            var jwt = jwtService.parseToken(token);
            if (jwt == null || jwt.isExpired()) {
                filterChain.doFilter(request, response);
                return;
            }

            // Check if individual token is blacklisted in Redis
            if (tokenRevocationService.isTokenRevoked(token)) {
                log.warn("Rejected blacklisted JWT token");
                filterChain.doFilter(request, response);
                return;
            }

            // Check if token was issued prior to a user-wide revocation event (e.g. password change)
            if (tokenRevocationService.isIssuedBeforeRevocation(jwt.getUserId(), jwt.getIssuedAt())) {
                log.warn("Rejected JWT token issued prior to user revocation timestamp for user id {}", jwt.getUserId());
                filterChain.doFilter(request, response);
                return;
            }

            var authentication = new UsernamePasswordAuthenticationToken(
                    jwt.getUserId(),
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + jwt.getRole()))
            );
            authentication.setDetails(
                    new WebAuthenticationDetailsSource().buildDetails(request)
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            log.warn("JWT Token has expired: {}", e.getMessage());
        } catch (Exception e) {
            log.error("Cannot set user authentication: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}
