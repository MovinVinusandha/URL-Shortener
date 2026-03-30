package com.url_shortener.url_shortener.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsResponseDto {
    private Long totalClicks;
    private List<ClickDataPoint> clicksByDate;
    private List<CountryDataPoint> clicksByCountry;
    private List<DeviceDataPoint> clicksByDevice;
    private List<BrowserDataPoint> clicksByBrowser;
}
