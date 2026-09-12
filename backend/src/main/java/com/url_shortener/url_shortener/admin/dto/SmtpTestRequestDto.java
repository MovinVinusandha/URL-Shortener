package com.url_shortener.url_shortener.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SmtpTestRequestDto {
    @NotBlank(message = "Recipient email cannot be blank")
    @Email(message = "Recipient must be a valid email address")
    private String recipientEmail;
}
