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
import com.url_shortener.url_shortener.users.UserRepository;
import com.url_shortener.url_shortener.users.UserNotFoundException;
import org.springframework.beans.factory.annotation.Value;

import lombok.extern.slf4j.Slf4j;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
public class UrlController {

    private final UrlService urlService;
    private final AnalyticsService analyticsService;
    private final QrCodeService qrCodeService;
    private final UserRepository userRepository;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${app.dashboard.url:http://app.localhost}")
    private String dashboardUrl;

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
        try {
            var longUrl = urlService.getLongUrlForRedirect(hash);

            // Fire async click tracking — does not block the redirect response
            String userAgent = request.getHeader("User-Agent");
            String clientIp  = resolveClientIp(request);
            String referer   = request.getHeader("Referer");
            Map<String, String> queryParams = extractQueryParams(request);

            analyticsService.trackClick(hash, userAgent, clientIp, referer, queryParams);

            // Query parameter pass-through: append any dynamic query params to destination
            if (request.getQueryString() != null && !request.getQueryString().isBlank()) {
                String separator = longUrl.contains("?") ? "&" : "?";
                longUrl = longUrl + separator + request.getQueryString();
            }

            HttpHeaders headers = new HttpHeaders();
            headers.add("Location", longUrl);
            return new ResponseEntity<>(headers, HttpStatus.FOUND);
        } catch (LinkQuarantinedException e) {
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(java.net.URI.create(dashboardUrl + "/blocked/" + hash))
                    .build();
        } catch (PasswordProtectedException e) {
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(java.net.URI.create(dashboardUrl + "/secure/" + hash))
                    .build();
        } catch (UrlNotFoundException e) {
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(java.net.URI.create(dashboardUrl + "/not-found"))
                    .build();
        }
    }

    @PostMapping("/unlock/{hash}")
    @Operation(summary = "Unlock a password protected short url")
    public ResponseEntity<UnlockResponse> unlockUrl(
            @PathVariable String hash,
            @Valid @RequestBody UnlockRequest unlockRequest,
            HttpServletRequest request
    ) {
        log.info("UNLOCK ENDPOINT HIT - Attempting to unlock hash: {}", hash);
        var longUrl = urlService.getUrlForUnlock(hash, unlockRequest.getPassword());

        String userAgent = request.getHeader("User-Agent");
        String clientIp  = resolveClientIp(request);
        String referer   = request.getHeader("Referer");
        Map<String, String> queryParams = extractQueryParams(request);

        analyticsService.trackClick(hash, userAgent, clientIp, referer, queryParams);

        return ResponseEntity.ok(new UnlockResponse(longUrl));
    }

    private Map<String, String> extractQueryParams(HttpServletRequest request) {
        Map<String, String> queryParams = new HashMap<>();
        if (request.getParameterMap() != null) {
            for (Map.Entry<String, String[]> entry : request.getParameterMap().entrySet()) {
                if (entry.getValue() != null && entry.getValue().length > 0) {
                    queryParams.put(entry.getKey(), entry.getValue()[0]);
                }
            }
        }
        return queryParams;
    }

    @GetMapping("/url/{hash}")
    @Operation(summary = "Get details about url")
    public ResponseEntity<UrlDto> getUrl(@PathVariable String hash) {
        var urlDto = urlService.getUrl(hash);
        return ResponseEntity.ok(urlDto);
    }

    @GetMapping("url/all")
    public Iterable<UrlDto> getAllUsers(
            @RequestParam(required = false, defaultValue = "", name = "sort") String sortBy,
            @RequestParam(required = false) Long tagId,
            @RequestParam(required = false) Long folderId,
            @RequestParam(required = false) String folderSlug,
            @RequestParam(required = false) String search
    ) {
        return urlService.getAllUrls(sortBy, tagId, folderId, folderSlug, search);
    }

    @PutMapping("/url/{hash}")
    public ResponseEntity<UrlDto> updateUrl(
            @PathVariable String hash,
            @RequestBody UrlUpdateRequestDto request
    ) {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new org.springframework.security.access.AccessDeniedException("You must be logged in to update a URL.");
        }
        Long userId = (Long) auth.getPrincipal();
        var currentUser = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);
        
        var urlDto = urlService.updateUrl(hash, request, currentUser);
        return ResponseEntity.ok(urlDto);
    }

    @DeleteMapping("/url/{hash}")
    public ResponseEntity<Void> deleteUrl(@PathVariable String hash) {
        urlService.deleteUrl(hash);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/url/batch-campaign")
    @Operation(summary = "Generate multi-channel campaign short urls in batch")
    public ResponseEntity<BatchCampaignResponseDto> createBatchCampaignUrls(
            @Valid @RequestBody BatchCampaignRequestDto request
    ) {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new org.springframework.security.access.AccessDeniedException("You must be logged in to create multi-channel campaign links.");
        }
        Long userId = (Long) auth.getPrincipal();
        var currentUser = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);

        var response = urlService.createBatchCampaignUrls(request, currentUser);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/url/bulk-action")
    @Operation(summary = "Execute bulk actions on multiple short URLs")
    public ResponseEntity<BulkUrlActionResponseDto> executeBulkAction(
            @Valid @RequestBody BulkUrlActionRequestDto request
    ) {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new org.springframework.security.access.AccessDeniedException("You must be logged in to execute bulk actions.");
        }
        Long userId = (Long) auth.getPrincipal();
        var currentUser = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);

        var response = urlService.executeBulkAction(request, currentUser);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/url/{hash}/qr")
    @Operation(summary = "Generate a QR code for a short url")
    public ResponseEntity<byte[]> getQrCode(
            @PathVariable String hash,
            @RequestParam(defaultValue = "300") int size
    ) {
        byte[] imageBytes = qrCodeService.generateQrCode(hash, size, size);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .body(imageBytes);
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
