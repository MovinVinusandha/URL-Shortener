package com.url_shortener.url_shortener.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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

    private SystemHealthDto systemHealth;
    private List<TopDomainDto> topDomains;

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
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopDomainDto {
        private String domain;
        private long count;
    }
}
