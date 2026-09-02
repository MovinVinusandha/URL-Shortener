package com.url_shortener.url_shortener.urls;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CustomChannelDto {
    private Long id;
    private String name;
    private String utmSource;
    private String utmMedium;
    private LocalDateTime createdAt;
}
