package com.url_shortener.url_shortener.urls;

import com.url_shortener.url_shortener.users.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UtmTemplateRepository extends JpaRepository<UtmTemplate, Long> {

    List<UtmTemplate> findByUserOrderByCreatedAtDesc(User user);

    List<UtmTemplate> findByUserAndIsDefaultTrue(User user);

    Optional<UtmTemplate> findByIdAndUser(Long id, User user);

    boolean existsByNameIgnoreCaseAndUserId(String name, Long userId);
}
