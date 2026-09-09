package com.url_shortener.url_shortener.auth;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {

    @NotBlank(message = "Email or username is required")
    @JsonAlias({"email", "username"})
    private String identifier;

    @NotBlank(message = "Password is required")
    private String password;

    // Backward compatibility for existing tests calling getEmail()
    public String getEmail() {
        return identifier;
    }

    public void setEmail(String email) {
        this.identifier = email;
    }
}
