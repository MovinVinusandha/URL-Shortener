package com.url_shortener.url_shortener.security;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SecurityIncidentRepository extends JpaRepository<SecurityIncident, Long> {
    Page<SecurityIncident> findByIsResolved(Boolean isResolved, Pageable pageable);
    Page<SecurityIncident> findAllByOrderByCreatedAtDesc(Pageable pageable);
    long countByIsResolvedFalse();
}
