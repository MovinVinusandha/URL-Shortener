package com.url_shortener.url_shortener.urls;

import com.url_shortener.url_shortener.users.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TagRepository extends JpaRepository<Tag, Long> {
    List<Tag> findByUser(User user);
}
