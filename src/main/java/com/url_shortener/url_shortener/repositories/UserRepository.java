package com.url_shortener.url_shortener.repositories;

import com.url_shortener.url_shortener.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsUserByEmail(String email);
}
