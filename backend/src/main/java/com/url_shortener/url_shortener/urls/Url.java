package com.url_shortener.url_shortener.urls;

import com.url_shortener.url_shortener.statistics.Statistic;
import com.url_shortener.url_shortener.users.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

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

    @OneToOne(mappedBy = "urls", cascade = {CascadeType.PERSIST, CascadeType.REMOVE})
    private Statistic statistic;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

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
}