package com.url_shortener.url_shortener.users;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserUpdateRequestDto {
    @Pattern(regexp = "^(|[a-zA-Z0-9_]{3,30})$", message = "Username must be 3-30 characters containing only letters, numbers, and underscores")
    private String username;

    @NotBlank(message = "Email cannot be empty")
    @Email(message = "Invalid email format")
    private String email;

    public UserUpdateRequestDto(String email) {
        this.email = email;
    }
}
