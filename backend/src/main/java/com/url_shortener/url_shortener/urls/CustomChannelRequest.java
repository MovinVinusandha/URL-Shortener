package com.url_shortener.url_shortener.urls;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CustomChannelRequest {

    @NotBlank(message = "Channel name is required")
    private String name;

    @NotBlank(message = "UTM source is required")
    private String utmSource;

    @NotBlank(message = "UTM medium is required")
    private String utmMedium;
}
