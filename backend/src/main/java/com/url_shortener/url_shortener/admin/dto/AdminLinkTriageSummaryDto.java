package com.url_shortener.url_shortener.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminLinkTriageSummaryDto {
    private long needsAttentionCount;
    private long spikeCount;
    private long quarantinedCount;
    private long createdLast24hCount;
    private long totalLinks;
}
