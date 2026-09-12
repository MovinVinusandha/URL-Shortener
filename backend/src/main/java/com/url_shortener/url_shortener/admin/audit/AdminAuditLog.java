package com.url_shortener.url_shortener.admin.audit;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "admin_audit_logs", indexes = {
        @Index(name = "idx_audit_created_at", columnList = "created_at"),
        @Index(name = "idx_audit_action", columnList = "action"),
        @Index(name = "idx_audit_actor_email", columnList = "actor_email"),
        @Index(name = "idx_audit_target_type", columnList = "target_type")
})
public class AdminAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_id")
    private Long actorId;

    @Column(name = "actor_email", nullable = false)
    private String actorEmail;

    @Column(name = "actor_role", nullable = false, length = 30)
    private String actorRole;

    @Column(name = "actor_ip", length = 64)
    private String actorIp;

    @Column(name = "action", nullable = false, length = 64)
    private String action; // e.g., LINK_QUARANTINED, USER_SUSPENDED, IP_BLOCKED, etc.

    @Column(name = "target_type", nullable = false, length = 64)
    private String targetType; // LINK, USER, DOMAIN, IP, SETTING, INCIDENT

    @Column(name = "target_identifier", length = 255)
    private String targetIdentifier; // shortUrl, email, domain, ip, etc.

    @Column(name = "details", columnDefinition = "TEXT")
    private String details;

    @Column(name = "metadata_json", columnDefinition = "TEXT")
    private String metadataJson;

    @Column(name = "prev_hash", nullable = false, length = 64)
    private String prevHash;

    @Column(name = "entry_hash", nullable = false, length = 64)
    private String entryHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now().truncatedTo(java.time.temporal.ChronoUnit.MILLIS);
        }
    }

    @PreUpdate
    protected void onPreUpdate() {
        throw new UnsupportedOperationException("Admin audit logs are strictly append-only and cannot be updated.");
    }

    @PreRemove
    protected void onPreRemove() {
        throw new UnsupportedOperationException("Admin audit logs are strictly append-only and cannot be deleted.");
    }
}
