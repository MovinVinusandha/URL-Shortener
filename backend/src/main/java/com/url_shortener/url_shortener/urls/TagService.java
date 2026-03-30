package com.url_shortener.url_shortener.urls;

import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TagService {

    private final TagRepository tagRepository;
    private final UserRepository userRepository;
    private final UrlRepository urlRepository;

    public List<TagDto> getAllTagsForUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new AccessDeniedException("You must be logged in to view tags.");
        }
        
        Long userId = (Long) authentication.getPrincipal();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return tagRepository.findByUser(user).stream()
                .map(t -> new TagDto(t.getId(), t.getName(), t.getColor(), urlRepository.countByTagsId(t.getId())))
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

        if (tagRepository.existsByNameIgnoreCaseAndUserId(request.getName().trim(), userId)) {
            throw new TagAlreadyExistsException("A tag with this name already exists.");
        }

        Tag tag = Tag.builder()
                .name(request.getName().trim())
                .color(request.getColor() != null ? request.getColor().trim() : null)
                .user(user)
                .build();

        Tag savedTag = tagRepository.save(tag);
        return new TagDto(savedTag.getId(), savedTag.getName(), savedTag.getColor(), 0);
    }

    @Transactional
    public TagDto updateTag(Long id, TagRequest request) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new AccessDeniedException("You must be logged in to update tags.");
        }

        Long userId = (Long) authentication.getPrincipal();
        Tag tag = tagRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tag not found"));

        if (!tag.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You cannot update a tag you do not own.");
        }

        String newName = request.getName().trim();
        if (!tag.getName().equalsIgnoreCase(newName)) {
            if (tagRepository.existsByNameIgnoreCaseAndUserId(newName, userId)) {
                throw new TagAlreadyExistsException("A tag with this name already exists.");
            }
            tag.setName(newName);
        }

        tag.setColor(request.getColor() != null ? request.getColor().trim() : null);

        Tag savedTag = tagRepository.save(tag);
        int linkCount = urlRepository.countByTagsId(savedTag.getId());
        
        return new TagDto(savedTag.getId(), savedTag.getName(), savedTag.getColor(), linkCount);
    }

    @Transactional
    public void deleteTag(Long id) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new AccessDeniedException("You must be logged in to delete tags.");
        }

        Long userId = (Long) authentication.getPrincipal();
        Tag tag = tagRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tag not found"));

        if (!tag.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You cannot delete a tag you do not own.");
        }

        tagRepository.deleteTagAssociations(id);
        tagRepository.deleteById(id);
    }
}
