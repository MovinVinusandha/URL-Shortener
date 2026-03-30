package com.url_shortener.url_shortener.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeviceDataPoint {
    private String device;
    private Long count;
}
