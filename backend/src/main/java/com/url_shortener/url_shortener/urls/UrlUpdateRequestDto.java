package com.url_shortener.url_shortener.urls;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class UrlUpdateRequestDto {
    private String longUrl;
    private String password;
    private LocalDateTime expiresAt;
    private List<Long> tagIds;
}
