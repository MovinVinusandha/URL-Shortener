package com.url_shortener.url_shortener.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemSettingDto {
    private String settingKey;
    private String settingValue;
    private String description;
    private LocalDateTime updatedAt;
}
