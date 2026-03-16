package com.url_shortener.url_shortener.urls;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.List;

@AllArgsConstructor
@Getter
public class UrlDto {
    private BigInteger id;
    private String longUrl;
    private String shortUrl;
    private BigInteger accessed_times;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;

    private boolean isActive;
    private boolean hasPassword;
    private List<TagDto> tags;
}
