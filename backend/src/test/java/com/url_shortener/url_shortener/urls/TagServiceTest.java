package com.url_shortener.url_shortener.urls;

import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TagServiceTest {

    @Mock
    private TagRepository tagRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private UrlRepository urlRepository;

    @InjectMocks
    private TagService tagService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).build();
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(1L, null, java.util.Collections.emptyList())
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createTag_Success() {
        TagRequest request = new TagRequest();
        request.setName("Important");
        request.setColor("#FF0000");

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(tagRepository.existsByNameIgnoreCaseAndUserId("Important", 1L)).thenReturn(false);
        
        Tag savedTag = Tag.builder().id(100L).name("Important").color("#FF0000").user(user).build();
        when(tagRepository.save(any(Tag.class))).thenReturn(savedTag);

        TagDto dto = tagService.createTag(request);

        assertThat(dto.getName()).isEqualTo("Important");
        assertThat(dto.getColor()).isEqualTo("#FF0000");
    }

    @Test
    void createTag_Conflict() {
        TagRequest request = new TagRequest();
        request.setName("Duplicate");

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(tagRepository.existsByNameIgnoreCaseAndUserId("Duplicate", 1L)).thenReturn(true);

        assertThatThrownBy(() -> tagService.createTag(request))
                .isInstanceOf(TagAlreadyExistsException.class);
    }

    @Test
    void deleteTag_Success() {
        Tag tag = Tag.builder().id(100L).user(user).build();
        when(tagRepository.findById(100L)).thenReturn(Optional.of(tag));

        tagService.deleteTag(100L);

        verify(tagRepository).deleteTagAssociations(100L);
        verify(tagRepository).deleteById(100L);
    }
}
