package com.url_shortener.url_shortener.dtos;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public class UrlRequest {
    @NotBlank(message = "url is required")
    private String longUrl;
}
