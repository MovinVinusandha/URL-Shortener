package com.url_shortener.url_shortener.users;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class UserDto {
    private String publicId;
    private String username;
    private String email;
    private String role;
    private boolean emailVerified;
    private boolean hasPassword;
    private List<String> connectedOAuthProviders;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    public UserDto(String publicId, String username, String email, String role, LocalDateTime createdAt) {
        this.publicId = publicId;
        this.username = username;
        this.email = email;
        this.role = role;
        this.emailVerified = true;
        this.hasPassword = true;
        this.connectedOAuthProviders = Collections.emptyList();
        this.createdAt = createdAt;
    }
}
