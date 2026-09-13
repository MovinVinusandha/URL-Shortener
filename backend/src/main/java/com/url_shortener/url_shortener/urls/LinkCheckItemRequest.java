package com.url_shortener.url_shortener.urls;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LinkCheckItemRequest {
    private String id;
    private String slug;
    private String url;
}
