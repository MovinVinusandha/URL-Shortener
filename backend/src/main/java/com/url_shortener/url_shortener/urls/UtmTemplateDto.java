package com.url_shortener.url_shortener.urls;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UtmTemplateDto {
    private Long id;
    private String name;
    private String source;
    private String medium;
    private String campaign;
    private String term;
    private String content;
    private String ref;
    private String customParams;
    private LocalDateTime createdAt;
}
