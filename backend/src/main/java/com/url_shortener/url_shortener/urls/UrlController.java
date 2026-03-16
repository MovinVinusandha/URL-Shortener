package com.url_shortener.url_shortener.urls;

import com.url_shortener.url_shortener.analytics.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Value;

@RestController
@RequiredArgsConstructor
public class UrlController {

    private final UrlService urlService;
    private final AnalyticsService analyticsService;
    private final QrCodeService qrCodeService;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @PostMapping("/shorten")
    @Operation(summary = "Generate short url")
    public ResponseEntity<UrlSend> generateShortUrl(@Valid @RequestBody UrlRequest urlRequest) {
        if (urlRequest.getCustomAlias() != null && !urlRequest.getCustomAlias().trim().isEmpty()) {
            var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
                throw new org.springframework.security.access.AccessDeniedException("You must be logged in to use a custom alias.");
            }
        }
        if (urlRequest.getExpiresAt() != null) {
            var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
                throw new org.springframework.security.access.AccessDeniedException("You must be logged in to set an expiration date.");
            }
        }
        var urlDto = urlService.generateShortUrl(urlRequest);
        return ResponseEntity.ok(urlDto);
    }

    @GetMapping("/{hash}")
    @Operation(summary = "Redirect to the original URL and record a click event")
    public ResponseEntity<Void> redirectToNewUrl(
            @PathVariable String hash,
            HttpServletRequest request
    ) {
        var longUrl = urlService.getLongUrlForRedirect(hash);

        // Fire async click tracking — does not block the redirect response
        String userAgent = request.getHeader("User-Agent");
        String clientIp  = resolveClientIp(request);
        analyticsService.trackClick(hash, userAgent, clientIp);

        HttpHeaders headers = new HttpHeaders();
        headers.add("Location", longUrl);
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    @PostMapping("/unlock/{hash}")
    @Operation(summary = "Unlock a password protected short url")
    public ResponseEntity<UnlockResponse> unlockUrl(
            @PathVariable String hash,
            @Valid @RequestBody UnlockRequest unlockRequest,
            HttpServletRequest request
    ) {
        var longUrl = urlService.getUrlForUnlock(hash, unlockRequest.getPassword());

        String userAgent = request.getHeader("User-Agent");
        String clientIp  = resolveClientIp(request);
        analyticsService.trackClick(hash, userAgent, clientIp);

        return ResponseEntity.ok(new UnlockResponse(longUrl));
    }

    @GetMapping("/url/{hash}")
    @Operation(summary = "Get details about url")
    public ResponseEntity<UrlDto> getUrl(@PathVariable String hash) {
        var urlDto = urlService.getUrl(hash);
        return ResponseEntity.ok(urlDto);
    }

    @GetMapping("url/all")
    public Iterable<UrlDto> getAllUsers(
            @RequestParam(required = false, defaultValue = "", name = "sort") String sortBy
    ) {
        return urlService.getAllUrls(sortBy);
    }

    @PutMapping("/url/{hash}")
    public ResponseEntity<UrlUpdateDto> updateUrl(
            @PathVariable String hash,
            @Valid @RequestBody UrlRequest urlRequest
    ) {
        var urlUpdateDto = urlService.updateUrl(urlRequest, hash);
        return ResponseEntity.ok(urlUpdateDto);
    }

    @DeleteMapping("/url/{hash}")
    public ResponseEntity<Void> deleteUrl(@PathVariable String hash) {
        urlService.deleteUrl(hash);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/url/{hash}/qr")
    @Operation(summary = "Generate a QR code for a short url")
    public ResponseEntity<byte[]> getQrCode(@PathVariable String hash) {
        var urlDto = urlService.getUrl(hash);
        String fullShortUrl = frontendUrl + "/" + urlDto.getShortUrl();
        byte[] qrCodeImage = qrCodeService.generateQrCode(fullShortUrl, 300, 300);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.IMAGE_PNG);
        return new ResponseEntity<>(qrCodeImage, headers, HttpStatus.OK);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Resolves the real client IP address, accounting for reverse proxies (e.g., Nginx).
     * <p>
     * Priority order:
     * <ol>
     *   <li>{@code X-Forwarded-For} header — set by Nginx/load balancer (first IP in list)</li>
     *   <li>{@code X-Real-IP} header — alternative proxy header</li>
     *   <li>{@code request.getRemoteAddr()} — direct connection fallback</li>
     * </ol>
     */
    private String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            // X-Forwarded-For can be a comma-separated list: "client, proxy1, proxy2"
            // The first entry is always the original client IP
            return xff.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank()) {
            return xRealIp.trim();
        }

        return request.getRemoteAddr();
    }
}
