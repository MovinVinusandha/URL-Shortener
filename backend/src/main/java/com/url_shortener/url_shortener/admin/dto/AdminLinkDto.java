package com.url_shortener.url_shortener.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminLinkDto {
    private Long id;
    private String shortUrl;
    private String fullShortUrl;
    private String longUrl;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private boolean isActive;
    private boolean isQuarantined;
    private String quarantineReason;
    private boolean isPasswordProtected;
    private long totalClicks;
    private String userEmail;
    private String username;
    private String userPublicId;
}
