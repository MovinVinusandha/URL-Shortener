package com.url_shortener.url_shortener.auth;

import com.url_shortener.url_shortener.users.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {
    Optional<EmailVerificationToken> findByTokenHash(String tokenHash);
    void deleteByUser(User user);
}
