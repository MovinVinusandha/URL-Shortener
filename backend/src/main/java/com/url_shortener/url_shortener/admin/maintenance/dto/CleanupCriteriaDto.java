package com.url_shortener.url_shortener.admin.maintenance.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CleanupCriteriaDto {

    public enum CleanupType {
        EXPIRED,       // expiresAt < NOW()
        INACTIVE,      // isActive == false
        DORMANT        // 0 clicks and created older than daysThreshold
    }

    @NotNull
    private CleanupType cleanupType;

    @Builder.Default
    private Integer daysThreshold = 30;

    @Builder.Default
    private boolean hardDelete = false;
}
