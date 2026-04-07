package com.url_shortener.url_shortener.users;

import com.url_shortener.url_shortener.urls.Url;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "public_id", nullable = false, unique = true)
    private String publicId;

    @Column(name = "name")
    private String name;

    @Column(name = "email")
    private String email;

    @Column(name = "password")
    private String password;

    @Column(name = "role")
    @Enumerated(EnumType.STRING)
    private Role role;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "user")
    private List<Url> urls = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        // 1. Ensure role is never null
        if (this.role == null) {
            this.role = Role.USER; // Or whatever your standard user enum is
        }
        // 2. Generate Public ID safely
        if (this.publicId == null) {
            String randomPart = java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 10);
            this.publicId = this.role.name().toLowerCase() + "_" + randomPart;
        }
    }
}