package com.url_shortener.url_shortener.users;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PasswordSetRequestDto {
    @NotBlank(message = "New password cannot be empty")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String newPassword;
}
