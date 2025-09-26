package com.url_shortener.url_shortener.dtos;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public class UrlDto {
    private String longUrl;
    private String shortUrl;
}
