package com.url_shortener.url_shortener.admin.maintenance.dto;

import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClickPruneRequestDto {

    @Min(value = 1, message = "Days older than must be at least 1 day")
    @Builder.Default
    private int daysOlderThan = 90;

    @Builder.Default
    private boolean dryRun = true;
}
