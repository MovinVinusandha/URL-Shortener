package com.url_shortener.url_shortener.admin.dto;

import com.url_shortener.url_shortener.users.Role;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RoleUpdateRequestDto {
    @NotNull(message = "Role is required")
    private Role role;
}
