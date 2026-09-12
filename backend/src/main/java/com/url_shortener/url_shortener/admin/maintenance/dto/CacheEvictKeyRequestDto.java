package com.url_shortener.url_shortener.admin.maintenance.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CacheEvictKeyRequestDto {
    @NotBlank(message = "Cache key or URL hash cannot be empty")
    private String key;
}
