package com.url_shortener.url_shortener.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnvironmentVaultDto {
    private String key;
    private String category; // DATABASE, ROUTING, SECURITY, MAIL, OAUTH, SYSTEM
    private String value;
    private boolean isSecret;
    private String source; // ENV, DYNAMIC_OVERRIDE
    private String description;
}
