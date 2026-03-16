package com.url_shortener.url_shortener.urls;

import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TagService {

    private final TagRepository tagRepository;
    private final UserRepository userRepository;

    public List<TagDto> getAllTagsForUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new AccessDeniedException("You must be logged in to view tags.");
        }
        
        Long userId = (Long) authentication.getPrincipal();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return tagRepository.findByUser(user).stream()
                .map(t -> new TagDto(t.getId(), t.getName(), t.getColor()))
                .collect(Collectors.toList());
    }

    public TagDto createTag(TagRequest request) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new AccessDeniedException("You must be logged in to create tags.");
        }

        Long userId = (Long) authentication.getPrincipal();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Tag tag = Tag.builder()
                .name(request.getName().trim())
                .color(request.getColor() != null ? request.getColor().trim() : null)
                .user(user)
                .build();

        Tag savedTag = tagRepository.save(tag);
        return new TagDto(savedTag.getId(), savedTag.getName(), savedTag.getColor());
    }
}
