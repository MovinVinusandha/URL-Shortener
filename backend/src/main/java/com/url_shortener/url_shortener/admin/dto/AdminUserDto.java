package com.url_shortener.url_shortener.admin.dto;

import com.url_shortener.url_shortener.users.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserDto {
    private Long id;
    private String publicId;
    private String username;
    private String email;
    private Role role;
    private boolean emailVerified;
    private boolean isSuspended;
    private String suspendedReason;
    private long linkCount;
    private long totalClicks;
    private LocalDateTime createdAt;
}
