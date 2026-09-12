package com.url_shortener.url_shortener.security;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BlockedIpRepository extends JpaRepository<BlockedIp, Long> {
    boolean existsByIpAddress(String ipAddress);
    Optional<BlockedIp> findByIpAddress(String ipAddress);
}
