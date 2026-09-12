package com.url_shortener.url_shortener.admin.maintenance.dto;

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
public class CleanupResultDto {
    private boolean dryRun;
    private long affectedCount;
    private String operation;
    private String message;
    private List<String> sampleAffectedUrls;
    private LocalDateTime timestamp;
}
