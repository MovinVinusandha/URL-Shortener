package com.url_shortener.url_shortener.urls;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkUrlActionResponseDto {
    private boolean success;
    private int affectedCount;
    private String message;
}
