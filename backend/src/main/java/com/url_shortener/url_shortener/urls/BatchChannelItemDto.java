package com.url_shortener.url_shortener.urls;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchChannelItemDto {
    @NotBlank(message = "Channel name is required")
    private String name;

    @NotBlank(message = "UTM source is required")
    private String utmSource;

    private String utmMedium;
    private String utmTerm;
    private String utmContent;
}
