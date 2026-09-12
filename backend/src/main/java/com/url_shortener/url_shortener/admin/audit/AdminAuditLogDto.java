package com.url_shortener.url_shortener.admin.audit;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAuditLogDto {
    private Long id;
    private Long actorId;
    private String actorEmail;
    private String actorRole;
    private String actorIp;
    private String action;
    private String targetType;
    private String targetIdentifier;
    private String details;
    private String metadataJson;
    private String prevHash;
    private String entryHash;
    private LocalDateTime createdAt;
}
