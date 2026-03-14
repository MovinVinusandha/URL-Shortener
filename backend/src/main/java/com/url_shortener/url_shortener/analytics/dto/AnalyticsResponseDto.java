package com.url_shortener.url_shortener.analytics.dto;

import java.util.List;

public record AnalyticsResponseDto(
        Long totalClicks,
        List<DateCountDto> clicksByDate,
        List<StringCountDto> clicksByCountry,
        List<StringCountDto> clicksByDevice,
        List<StringCountDto> clicksByBrowser
) {}
