package com.url_shortener.url_shortener.users;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsUserByEmail(String email);

    boolean existsUserByName(String name);

    boolean existsByRole(Role role);

    Optional<User> findByEmail(String email);
    Optional<User> findByPublicId(String publicId);
}
