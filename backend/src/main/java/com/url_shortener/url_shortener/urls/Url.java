package com.url_shortener.url_shortener.urls;

import com.url_shortener.url_shortener.statistics.Statistic;
import com.url_shortener.url_shortener.users.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Table(name = "urls")
public class Url {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "long_url")
    private String longUrl;

    @Column(name = "short_url")
    private String shortUrl;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "is_active")
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "password_hash")
    private String passwordHash;

    @OneToOne(mappedBy = "urls", cascade = {CascadeType.PERSIST, CascadeType.REMOVE})
    private Statistic statistic;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "url_tags", joinColumns = @JoinColumn(name = "url_id"), inverseJoinColumns = @JoinColumn(name = "tag_id"))
    @Builder.Default
    private Set<Tag> tags = new HashSet<>();

    public void addStatistic(Statistic statistic){
        this.statistic = statistic;
        statistic.setUrls(this);
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public boolean isHasPassword() {
        return this.passwordHash != null && !this.passwordHash.isEmpty();
    }
}