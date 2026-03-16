package com.url_shortener.url_shortener.urls;

import com.url_shortener.url_shortener.users.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TagRepository extends JpaRepository<Tag, Long> {
    List<Tag> findByUser(User user);
    boolean existsByNameIgnoreCaseAndUserId(String name, Long userId);

    @Modifying
    @Query(value = "DELETE FROM url_tags WHERE tag_id = :tagId", nativeQuery = true)
    void deleteTagAssociations(@Param("tagId") Long tagId);
}
