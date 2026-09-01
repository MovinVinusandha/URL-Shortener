package com.url_shortener.url_shortener.urls;

import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UtmTemplateServiceTest {

    @Mock
    private UtmTemplateRepository utmTemplateRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UtmTemplateService utmTemplateService;

    private User user;
    private UtmTemplate template;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(1L)
                .email("test@example.com")
                .build();

        template = UtmTemplate.builder()
                .id(10L)
                .name("Summer Promo")
                .source("google")
                .medium("cpc")
                .campaign("summer_sale")
                .term("shoes")
                .content("ad_1")
                .ref("mysite.com")
                .createdAt(LocalDateTime.now())
                .user(user)
                .build();
    }

    @Test
    void getUserTemplates_Success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(utmTemplateRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of(template));

        List<UtmTemplateDto> dtos = utmTemplateService.getUserTemplates(1L);

        assertEquals(1, dtos.size());
        assertEquals("Summer Promo", dtos.get(0).getName());
        assertEquals("google", dtos.get(0).getSource());
    }

    @Test
    void createTemplate_Success() {
        UtmTemplateRequest request = UtmTemplateRequest.builder()
                .name("New Promo")
                .source("twitter")
                .medium("social")
                .campaign("launch")
                .build();

        when(utmTemplateRepository.existsByNameIgnoreCaseAndUserId("New Promo", 1L)).thenReturn(false);
        when(utmTemplateRepository.save(any(UtmTemplate.class))).thenAnswer(invocation -> {
            UtmTemplate t = invocation.getArgument(0);
            t.setId(11L);
            return t;
        });

        UtmTemplateDto result = utmTemplateService.createTemplate(request, user);

        assertNotNull(result);
        assertEquals(11L, result.getId());
        assertEquals("New Promo", result.getName());
        assertEquals("twitter", result.getSource());
    }

    @Test
    void createTemplate_DuplicateName_ThrowsException() {
        UtmTemplateRequest request = UtmTemplateRequest.builder()
                .name("Summer Promo")
                .build();

        when(utmTemplateRepository.existsByNameIgnoreCaseAndUserId("Summer Promo", 1L)).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> utmTemplateService.createTemplate(request, user));
    }

    @Test
    void updateTemplate_Success() {
        UtmTemplateRequest request = UtmTemplateRequest.builder()
                .name("Updated Promo")
                .source("facebook")
                .build();

        when(utmTemplateRepository.findById(10L)).thenReturn(Optional.of(template));
        when(utmTemplateRepository.existsByNameIgnoreCaseAndUserId("Updated Promo", 1L)).thenReturn(false);
        when(utmTemplateRepository.save(any(UtmTemplate.class))).thenReturn(template);

        UtmTemplateDto result = utmTemplateService.updateTemplate(10L, request, user);

        assertNotNull(result);
        assertEquals("Updated Promo", result.getName());
        assertEquals("facebook", result.getSource());
    }

    @Test
    void updateTemplate_NotOwner_ThrowsAccessDenied() {
        User otherUser = User.builder().id(2L).build();
        template.setUser(otherUser);

        UtmTemplateRequest request = UtmTemplateRequest.builder()
                .name("Updated Promo")
                .build();

        when(utmTemplateRepository.findById(10L)).thenReturn(Optional.of(template));

        assertThrows(AccessDeniedException.class, () -> utmTemplateService.updateTemplate(10L, request, user));
    }

    @Test
    void deleteTemplate_Success() {
        when(utmTemplateRepository.findById(10L)).thenReturn(Optional.of(template));

        utmTemplateService.deleteTemplate(10L, user);

        verify(utmTemplateRepository, times(1)).delete(template);
    }
}
