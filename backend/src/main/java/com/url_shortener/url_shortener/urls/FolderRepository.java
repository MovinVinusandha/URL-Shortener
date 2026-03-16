package com.url_shortener.url_shortener.urls;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FolderRepository extends JpaRepository<Folder, Long> {
    List<Folder> findByUserId(Long userId);
    boolean existsByNameIgnoreCaseAndUserId(String name, Long userId);
}
