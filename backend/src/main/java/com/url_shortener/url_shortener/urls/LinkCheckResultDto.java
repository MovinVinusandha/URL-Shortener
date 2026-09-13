package com.url_shortener.url_shortener.urls;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LinkCheckResultDto {
    private String id;
    private String slug;
    private String url;
    private Integer statusCode;
    private String status; // NORMAL, ABNORMAL, NETWORK_ERROR
    private Long durationMs;
    private String error;
    private Boolean isRedirect;
    private String redirectUrl;

    // Item 3 enhancements: Redirect chain and security flags
    private Integer hopsCount;
    private List<String> redirectChain;
    private Boolean isHttpsDowngrade;
    private String securityWarning;
}
