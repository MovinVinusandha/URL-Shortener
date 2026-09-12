package com.url_shortener.url_shortener.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminOverviewDto {
    private long totalLinks;
    private long activeLinks;
    private long expiredLinks;
    private long quarantinedLinks;

    private long totalClicks;
    private long clicksLast24Hours;

    private long totalUsers;
    private long activeUsers;
    private long suspendedUsers;

    // Operational System Mode (NORMAL, READ_ONLY, MAINTENANCE)
    @Builder.Default
    private String systemMode = "NORMAL";

    // Security & Perimeter Pulse
    private SecurityPulseDto securityPulse;

    private SystemHealthDto systemHealth;
    private List<TopDomainDto> topDomains;

    // Time-series activity data for interactive charts
    private List<DailyActivityDataPoint> activitySeries;

    // Device and Geography Breakdown
    private List<DistributionDataPoint> deviceDistribution;
    private List<DistributionDataPoint> countryDistribution;

    // Recent Administrative Activity
    private List<RecentAuditActionDto> recentAuditActions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SystemHealthDto {
        private String redisStatus;
        private String redisMemory;
        private String sweeperStatus;
        private String lastSweeperRun;
        private int activeWorkerThreads;
        private Double totalDatabaseSizeMb;
        private Long totalCachedKeys;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SecurityPulseDto {
        private long unresolvedIncidents;
        private long blockedIpsCount;
        private long blacklistedDomainsCount;
        private boolean auditChainValid;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopDomainDto {
        private String domain;
        private long count;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyActivityDataPoint {
        private String date; // YYYY-MM-DD
        private long clicks;
        private long linksCreated;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DistributionDataPoint {
        private String name;
        private long count;
        private double percentage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentAuditActionDto {
        private Long id;
        private String action;
        private String actorEmail;
        private String targetType;
        private String targetIdentifier;
        private String details;
        private LocalDateTime createdAt;
    }
}
