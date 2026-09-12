package com.url_shortener.url_shortener.admin.maintenance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaintenanceOverviewDto {

    // Redis Health & Telemetry
    private boolean redisConnected;
    private String redisVersion;
    private String usedMemoryHuman;
    private String peakMemoryHuman;
    private Long totalKeys;
    private Long urlKeysCount;
    private Long connectedClients;
    private Long uptimeSeconds;
    private Long keyspaceHits;
    private Long keyspaceMisses;
    private Double hitRatioPercentage;

    // Database Telemetry
    private Double totalDatabaseSizeMb;
    private List<TableStorageDto> tables;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TableStorageDto {
        private String tableName;
        private Double sizeMb;
        private Long rowCount;
    }
}
