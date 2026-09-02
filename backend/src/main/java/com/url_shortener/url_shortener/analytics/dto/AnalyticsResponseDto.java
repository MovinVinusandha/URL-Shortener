package com.url_shortener.url_shortener.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsResponseDto {
    private Long totalClicks;
    private List<ClickDataPoint> clicksByDate;
    private List<CountryDataPoint> clicksByCountry;
    private List<DeviceDataPoint> clicksByDevice;
    private List<BrowserDataPoint> clicksByBrowser;

    // UTM Breakdowns
    private List<UtmDataPoint> clicksByUtmSource;
    private List<UtmDataPoint> clicksByUtmMedium;
    private List<UtmDataPoint> clicksByUtmCampaign;
    private List<UtmDataPoint> clicksByUtmTerm;
    private List<UtmDataPoint> clicksByUtmContent;
    private List<UtmDataPoint> clicksByReferer;
}
