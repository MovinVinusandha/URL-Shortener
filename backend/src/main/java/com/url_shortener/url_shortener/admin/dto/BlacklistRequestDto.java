package com.url_shortener.url_shortener.admin.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BlacklistRequestDto {
    @NotBlank(message = "Domain pattern is required")
    private String domainPattern;
    private String reason;
}
