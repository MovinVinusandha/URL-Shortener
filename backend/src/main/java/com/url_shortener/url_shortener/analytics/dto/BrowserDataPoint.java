package com.url_shortener.url_shortener.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BrowserDataPoint {
    private String browser;
    private Long count;
}
