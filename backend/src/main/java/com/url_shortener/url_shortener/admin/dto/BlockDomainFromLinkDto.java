package com.url_shortener.url_shortener.admin.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlockDomainFromLinkDto {
    @NotBlank(message = "Domain pattern cannot be blank")
    private String domainPattern;

    private String reason;
}
