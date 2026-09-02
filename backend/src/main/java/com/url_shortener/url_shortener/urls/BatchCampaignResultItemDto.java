package com.url_shortener.url_shortener.urls;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchCampaignResultItemDto {
    private String channelName;
    private String shortUrl;
    private String fullShortUrl;
    private String longUrlWithUtm;
    private String utmSource;
    private String utmMedium;
    private Long urlId;
}
