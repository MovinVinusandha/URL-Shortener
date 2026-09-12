package com.url_shortener.url_shortener.security;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "security_incidents")
public class SecurityIncident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "incident_type", nullable = false)
    private String incidentType; // e.g. MALWARE_URL, PHISHING_URL, SPAM_VELOCITY_SPIKE, BLOCKED_IP_ATTEMPT

    @Column(name = "severity", nullable = false)
    private String severity; // LOW, MEDIUM, HIGH, CRITICAL

    @Column(name = "target_url", columnDefinition = "TEXT")
    private String targetUrl;

    @Column(name = "short_url")
    private String shortUrl;

    @Column(name = "client_ip")
    private String clientIp;

    @Column(name = "user_email")
    private String userEmail;

    @Column(name = "details", columnDefinition = "TEXT")
    private String details;

    @Column(name = "is_resolved")
    @Builder.Default
    private Boolean isResolved = false;

    @Column(name = "resolved_by")
    private String resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.isResolved == null) {
            this.isResolved = false;
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
