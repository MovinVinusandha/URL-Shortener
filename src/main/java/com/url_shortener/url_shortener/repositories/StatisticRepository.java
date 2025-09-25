package com.url_shortener.url_shortener.repositories;

import com.url_shortener.url_shortener.entities.Statistic;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StatisticRepository extends JpaRepository<Statistic, Long> {
}