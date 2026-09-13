package com.url_shortener.url_shortener.urls;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LinkCheckBatchRequestDto {
    @NotEmpty
    private List<LinkCheckItemRequest> items;
    
    @Builder.Default
    private Integer timeoutSeconds = 8;
}
