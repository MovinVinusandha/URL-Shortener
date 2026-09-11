package com.url_shortener.url_shortener.admin;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BlacklistedDomainRepository extends JpaRepository<BlacklistedDomain, Long> {
    boolean existsByDomainPatternIgnoreCase(String domainPattern);
    Optional<BlacklistedDomain> findByDomainPatternIgnoreCase(String domainPattern);
}
