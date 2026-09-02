package com.url_shortener.url_shortener.urls;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomChannelRepository extends JpaRepository<CustomChannel, Long> {
    List<CustomChannel> findAllByUserIdOrderByIdAsc(Long userId);
    Optional<CustomChannel> findByIdAndUserId(Long id, Long userId);
    boolean existsByNameIgnoreCaseAndUserId(String name, Long userId);
}
