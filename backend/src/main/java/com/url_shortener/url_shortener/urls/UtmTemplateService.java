package com.url_shortener.url_shortener.urls;

import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserNotFoundException;
import com.url_shortener.url_shortener.users.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UtmTemplateService {

    private final UtmTemplateRepository utmTemplateRepository;
    private final UserRepository userRepository;

    public List<UtmTemplateDto> getUserTemplates(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);
        return utmTemplateRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public UtmTemplateDto createTemplate(UtmTemplateRequest request, User user) {
        String trimmedName = request.getName().trim();
        if (utmTemplateRepository.existsByNameIgnoreCaseAndUserId(trimmedName, user.getId())) {
            throw new IllegalArgumentException("A UTM template with this name already exists.");
        }

        boolean isDefault = Boolean.TRUE.equals(request.getIsDefault());
        if (isDefault) {
            clearUserDefaultTemplates(user);
        }

        UtmTemplate template = UtmTemplate.builder()
                .name(trimmedName)
                .source(trimOrNull(request.getSource()))
                .medium(trimOrNull(request.getMedium()))
                .campaign(trimOrNull(request.getCampaign()))
                .term(trimOrNull(request.getTerm()))
                .content(trimOrNull(request.getContent()))
                .ref(trimOrNull(request.getRef()))
                .isDefault(isDefault)
                .customParams(request.getCustomParams())
                .user(user)
                .build();

        UtmTemplate saved = utmTemplateRepository.save(template);
        return mapToDto(saved);
    }

    @Transactional
    public UtmTemplateDto updateTemplate(Long id, UtmTemplateRequest request, User user) {
        UtmTemplate template = utmTemplateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("UTM template not found"));

        if (!template.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("You cannot update a template you do not own.");
        }

        String newName = request.getName().trim();
        if (!template.getName().equalsIgnoreCase(newName)) {
            if (utmTemplateRepository.existsByNameIgnoreCaseAndUserId(newName, user.getId())) {
                throw new IllegalArgumentException("A UTM template with this name already exists.");
            }
            template.setName(newName);
        }

        if (request.getIsDefault() != null) {
            if (Boolean.TRUE.equals(request.getIsDefault())) {
                clearUserDefaultTemplates(user);
                template.setIsDefault(true);
            } else {
                template.setIsDefault(false);
            }
        }

        template.setSource(trimOrNull(request.getSource()));
        template.setMedium(trimOrNull(request.getMedium()));
        template.setCampaign(trimOrNull(request.getCampaign()));
        template.setTerm(trimOrNull(request.getTerm()));
        template.setContent(trimOrNull(request.getContent()));
        template.setRef(trimOrNull(request.getRef()));
        template.setCustomParams(request.getCustomParams());

        UtmTemplate saved = utmTemplateRepository.save(template);
        return mapToDto(saved);
    }

    @Transactional
    public UtmTemplateDto toggleDefaultTemplate(Long id, User user) {
        UtmTemplate template = utmTemplateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("UTM template not found"));

        if (!template.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("You cannot modify a template you do not own.");
        }

        boolean currentlyDefault = Boolean.TRUE.equals(template.getIsDefault());
        if (currentlyDefault) {
            template.setIsDefault(false);
        } else {
            clearUserDefaultTemplates(user);
            template.setIsDefault(true);
        }

        UtmTemplate saved = utmTemplateRepository.save(template);
        return mapToDto(saved);
    }

    private void clearUserDefaultTemplates(User user) {
        List<UtmTemplate> defaults = utmTemplateRepository.findByUserAndIsDefaultTrue(user);
        for (UtmTemplate t : defaults) {
            t.setIsDefault(false);
            utmTemplateRepository.save(t);
        }
    }

    @Transactional
    public void deleteTemplate(Long id, User user) {
        UtmTemplate template = utmTemplateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("UTM template not found"));

        if (!template.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("You cannot delete a template you do not own.");
        }

        utmTemplateRepository.delete(template);
    }

    private String trimOrNull(String str) {
        if (str == null || str.trim().isEmpty()) return null;
        return str.trim();
    }

    private UtmTemplateDto mapToDto(UtmTemplate t) {
        return UtmTemplateDto.builder()
                .id(t.getId())
                .name(t.getName())
                .source(t.getSource())
                .medium(t.getMedium())
                .campaign(t.getCampaign())
                .term(t.getTerm())
                .content(t.getContent())
                .ref(t.getRef())
                .isDefault(Boolean.TRUE.equals(t.getIsDefault()))
                .customParams(t.getCustomParams())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
