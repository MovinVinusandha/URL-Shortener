package com.url_shortener.url_shortener.admin.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnvVariableUpdateRequestDto {
    @NotBlank(message = "Variable key cannot be blank")
    private String key;

    private String value;
}
