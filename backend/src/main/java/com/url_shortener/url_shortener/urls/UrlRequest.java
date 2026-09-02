package com.url_shortener.url_shortener.urls;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.List;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class UrlRequest {
    @NotBlank(message = "url is required")
    private String longUrl;
    
    private String customAlias;

    @com.fasterxml.jackson.annotation.JsonFormat(shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSX", timezone = "UTC")
    private java.time.LocalDateTime expiresAt;
    
    private String password;
    
    private List<Long> tagIds;
    
    private Long folderId;
}
