package com.url_shortener.url_shortener.urls;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
@Service
public class LinkCheckService {

    private final HttpClient httpClient;
    private final ExecutorService executorService;
    private static final int MAX_REDIRECT_HOPS = 6;

    public LinkCheckService() {
        this.executorService = Executors.newFixedThreadPool(20);
        // HttpClient without automatic redirect following so we can record every hop and detect loops/downgrades
        this.httpClient = HttpClient.newBuilder()
                .executor(this.executorService)
                .followRedirects(HttpClient.Redirect.NEVER)
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
                    .hopsCount(0)
                    .redirectChain(List.of())
                    .isHttpsDowngrade(false)
                    .build();
        }

        String targetUrl = urlString.trim();
        if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
            targetUrl = "https://" + targetUrl;
        }

        List<String> redirectChain = new ArrayList<>();
        redirectChain.add(targetUrl);

        boolean isHttpsDowngrade = false;
        boolean startedWithHttps = targetUrl.startsWith("https://");
        String currentUrl = targetUrl;
        int hops = 0;
        Set<String> visitedUrls = new HashSet<>();
        visitedUrls.add(currentUrl);

        int effectiveTimeout = (timeoutSeconds > 0 && timeoutSeconds <= 60) ? timeoutSeconds : 8;

        try {
            int finalStatusCode = 0;
            String finalRedirectUrl = null;

            while (hops < MAX_REDIRECT_HOPS) {
                URI uri = URI.create(currentUrl);

                // Attempt HEAD first, fallback to GET if unsupported
                HttpRequest headRequest = HttpRequest.newBuilder()
                        .uri(uri)
                        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 TrimLinkChecker/1.0")
                        .timeout(Duration.ofSeconds(effectiveTimeout))
                        .method("HEAD", HttpRequest.BodyPublishers.noBody())
                        .build();

                HttpResponse<Void> response;
                try {
                    response = httpClient.send(headRequest, HttpResponse.BodyHandlers.discarding());
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
                    HttpRequest getRequest = HttpRequest.newBuilder()
                            .uri(uri)
                            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 TrimLinkChecker/1.0")
                            .timeout(Duration.ofSeconds(effectiveTimeout))
                            .GET()
                            .build();
                    response = httpClient.send(getRequest, HttpResponse.BodyHandlers.discarding());
                }

                finalStatusCode = response.statusCode();

                // Check for redirect status (301, 302, 303, 307, 308)
                if (finalStatusCode >= 300 && finalStatusCode < 400) {
                    var locationOpt = response.headers().firstValue("Location");
                    if (locationOpt.isPresent()) {
                        String nextLocation = locationOpt.get();
                        // Resolve relative redirect locations
                        URI nextUri = uri.resolve(nextLocation);
                        String resolvedNextUrl = nextUri.toString();

                        if (startedWithHttps && resolvedNextUrl.startsWith("http://")) {
                            isHttpsDowngrade = true;
                        }

                        if (visitedUrls.contains(resolvedNextUrl)) {
                            // Circular redirect detected
                            redirectChain.add(resolvedNextUrl);
                            long duration = System.currentTimeMillis() - startTime;
                            return builder
                                    .statusCode(finalStatusCode)
                                    .status("ABNORMAL")
                                    .durationMs(duration)
                                    .isRedirect(true)
                                    .redirectUrl(resolvedNextUrl)
                                    .hopsCount(hops + 1)
                                    .redirectChain(redirectChain)
                                    .isHttpsDowngrade(isHttpsDowngrade)
                                    .securityWarning("Circular redirect loop detected")
                                    .error("Circular redirect loop detected")
                                    .build();
                        }

                        visitedUrls.add(resolvedNextUrl);
                        redirectChain.add(resolvedNextUrl);
                        finalRedirectUrl = resolvedNextUrl;
                        currentUrl = resolvedNextUrl;
                        hops++;
                        continue;
                    }
                }

                // If not redirect, we reached destination
                break;
            }

            long duration = System.currentTimeMillis() - startTime;
            String status = (finalStatusCode >= 200 && finalStatusCode < 400) ? "NORMAL" : "ABNORMAL";

            // Formulate warnings
            String warning = null;
            if (isHttpsDowngrade) {
                warning = "Insecure redirect: Downgraded from HTTPS to unencrypted HTTP";
            } else if (hops > 2) {
                warning = "Long redirect chain: " + hops + " intermediate hops detected";
            }

            return builder
                    .statusCode(finalStatusCode)
                    .status(status)
                    .durationMs(duration)
                    .isRedirect(hops > 0)
                    .redirectUrl(finalRedirectUrl)
                    .hopsCount(hops)
                    .redirectChain(redirectChain)
                    .isHttpsDowngrade(isHttpsDowngrade)
                    .securityWarning(warning)
                    .error(status.equals("ABNORMAL") ? "HTTP Status " + finalStatusCode : null)
                    .build();

        } catch (java.net.http.HttpConnectTimeoutException | java.net.SocketTimeoutException e) {
            long duration = System.currentTimeMillis() - startTime;
            return builder
                    .status("NETWORK_ERROR")
                    .statusCode(0)
                    .durationMs(duration)
                    .hopsCount(hops)
                    .redirectChain(redirectChain)
                    .isHttpsDowngrade(isHttpsDowngrade)
                    .error("Timeout: " + e.getMessage())
                    .build();
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            String msg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return builder
                    .status("NETWORK_ERROR")
                    .statusCode(0)
                    .durationMs(duration)
                    .hopsCount(hops)
                    .redirectChain(redirectChain)
                    .isHttpsDowngrade(isHttpsDowngrade)
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
