package com.url_shortener.url_shortener.urls;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UnlockRequest {
    @NotBlank(message = "Password is required")
    private String password;
}
