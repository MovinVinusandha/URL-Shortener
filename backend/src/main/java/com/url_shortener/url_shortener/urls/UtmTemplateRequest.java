package com.url_shortener.url_shortener.urls;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UtmTemplateRequest {

    @NotBlank(message = "Template name is required")
    private String name;

    private String source;
    private String medium;
    private String campaign;
    private String term;
    private String content;
    private String ref;
    private Boolean isDefault;
    private String customParams;
}
