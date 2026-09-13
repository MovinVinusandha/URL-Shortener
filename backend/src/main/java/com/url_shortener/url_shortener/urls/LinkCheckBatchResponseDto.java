package com.url_shortener.url_shortener.urls;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LinkCheckBatchResponseDto {
    private List<LinkCheckResultDto> results;
    private int total;
    private int normal;
    private int abnormal;
    private int networkError;
}
