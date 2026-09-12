package com.url_shortener.url_shortener.security.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ThreatScanResultDto {
    private boolean safe;
    private int riskScore;
    private String threatType;
    private List<String> detectedThreats;
    private String engine;
    private long scanDurationMs;
}
