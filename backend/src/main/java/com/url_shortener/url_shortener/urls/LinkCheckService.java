package com.url_shortener.url_shortener.urls;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
@Service
public class LinkCheckService {

    private final HttpClient httpClient;
    private final ExecutorService executorService;

    public LinkCheckService() {
        this.executorService = Executors.newFixedThreadPool(20);
        this.httpClient = HttpClient.newBuilder()
                .executor(this.executorService)
                .followRedirects(HttpClient.Redirect.NORMAL)
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public LinkCheckResultDto checkSingle(String id, String slug, String urlString, int timeoutSeconds) {
        long startTime = System.currentTimeMillis();
        LinkCheckResultDto.LinkCheckResultDtoBuilder builder = LinkCheckResultDto.builder()
                .id(id)
                .slug(slug)
                .url(urlString);

        if (urlString == null || urlString.trim().isEmpty()) {
            return builder
                    .status("ABNORMAL")
                    .statusCode(400)
                    .durationMs(0L)
                    .error("URL is empty")
                    .build();
        }

        String targetUrl = urlString.trim();
        if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
            targetUrl = "https://" + targetUrl;
        }

        try {
            URI uri = URI.create(targetUrl);
            int effectiveTimeout = (timeoutSeconds > 0 && timeoutSeconds <= 60) ? timeoutSeconds : 8;

            // Attempt HEAD first
            HttpRequest headRequest = HttpRequest.newBuilder()
                    .uri(uri)
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 TrimLinkChecker/1.0")
                    .timeout(Duration.ofSeconds(effectiveTimeout))
                    .method("HEAD", HttpRequest.BodyPublishers.noBody())
                    .build();

            HttpResponse<Void> response;
            try {
                response = httpClient.send(headRequest, HttpResponse.BodyHandlers.discarding());
                // Some servers reject HEAD requests with 405 Method Not Allowed or 403 Forbidden
                if (response.statusCode() == 405 || response.statusCode() == 403) {
                    HttpRequest getRequest = HttpRequest.newBuilder()
                            .uri(uri)
                            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 TrimLinkChecker/1.0")
                            .timeout(Duration.ofSeconds(effectiveTimeout))
                            .GET()
                            .build();
                    response = httpClient.send(getRequest, HttpResponse.BodyHandlers.discarding());
                }
            } catch (Exception e) {
                // If HEAD fails, try GET once
                HttpRequest getRequest = HttpRequest.newBuilder()
                        .uri(uri)
                        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 TrimLinkChecker/1.0")
                        .timeout(Duration.ofSeconds(effectiveTimeout))
                        .GET()
                        .build();
                response = httpClient.send(getRequest, HttpResponse.BodyHandlers.discarding());
            }

            long duration = System.currentTimeMillis() - startTime;
            int statusCode = response.statusCode();
            String status = (statusCode >= 200 && statusCode < 400) ? "NORMAL" : "ABNORMAL";

            return builder
                    .statusCode(statusCode)
                    .status(status)
                    .durationMs(duration)
                    .isRedirect(statusCode >= 300 && statusCode < 400)
                    .redirectUrl(response.headers().firstValue("Location").orElse(null))
                    .error(status.equals("ABNORMAL") ? "HTTP Status " + statusCode : null)
                    .build();

        } catch (java.net.http.HttpConnectTimeoutException | java.net.SocketTimeoutException e) {
            long duration = System.currentTimeMillis() - startTime;
            return builder
                    .status("NETWORK_ERROR")
                    .statusCode(0)
                    .durationMs(duration)
                    .error("Timeout: " + e.getMessage())
                    .build();
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            String msg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return builder
                    .status("NETWORK_ERROR")
                    .statusCode(0)
                    .durationMs(duration)
                    .error(msg)
                    .build();
        }
    }

    public LinkCheckBatchResponseDto checkBatch(LinkCheckBatchRequestDto request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            return LinkCheckBatchResponseDto.builder()
                    .results(new ArrayList<>())
                    .total(0)
                    .normal(0)
                    .abnormal(0)
                    .networkError(0)
                    .build();
        }

        int timeout = request.getTimeoutSeconds() != null ? request.getTimeoutSeconds() : 8;

        List<CompletableFuture<LinkCheckResultDto>> futures = request.getItems().stream()
                .map(item -> CompletableFuture.supplyAsync(
                        () -> checkSingle(item.getId(), item.getSlug(), item.getUrl(), timeout),
                        executorService
                ))
                .toList();

        List<LinkCheckResultDto> results = futures.stream()
                .map(CompletableFuture::join)
                .toList();

        int normal = 0;
        int abnormal = 0;
        int networkError = 0;

        for (LinkCheckResultDto res : results) {
            if ("NORMAL".equalsIgnoreCase(res.getStatus())) {
                normal++;
            } else if ("ABNORMAL".equalsIgnoreCase(res.getStatus())) {
                abnormal++;
            } else {
                networkError++;
            }
        }

        return LinkCheckBatchResponseDto.builder()
                .results(results)
                .total(results.size())
                .normal(normal)
                .abnormal(abnormal)
                .networkError(networkError)
                .build();
    }
}
