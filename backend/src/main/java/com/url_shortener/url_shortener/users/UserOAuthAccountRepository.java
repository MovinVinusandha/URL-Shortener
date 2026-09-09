package com.url_shortener.url_shortener.users;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserOAuthAccountRepository extends JpaRepository<UserOAuthAccount, Long> {
    Optional<UserOAuthAccount> findByProviderAndProviderUserId(String provider, String providerUserId);
    List<UserOAuthAccount> findByUser(User user);
    Optional<UserOAuthAccount> findByUserAndProvider(User user, String provider);
    boolean existsByUserAndProvider(User user, String provider);
    void deleteByUserAndProvider(User user, String provider);
}
