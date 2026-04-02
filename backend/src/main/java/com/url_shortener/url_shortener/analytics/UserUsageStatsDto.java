package com.url_shortener.url_shortener.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserUsageStatsDto {
    private long totalLinks;
    private long totalClicks;
}
