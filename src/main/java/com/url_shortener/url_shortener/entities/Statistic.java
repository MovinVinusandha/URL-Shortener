package com.url_shortener.url_shortener.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Table(name = "statistics")
public class Statistic {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "accessed_times")
    private Long accessedTimes;

    @MapsId
    @OneToOne
    @JoinColumn(name = "id")
    private Url urls;
}