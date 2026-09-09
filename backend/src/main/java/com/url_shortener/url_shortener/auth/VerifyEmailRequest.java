package com.url_shortener.url_shortener.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class VerifyEmailRequest {
    @NotBlank(message = "Verification token is required")
    private String token;
}
