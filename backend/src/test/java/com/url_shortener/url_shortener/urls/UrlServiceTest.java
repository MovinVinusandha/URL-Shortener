package com.url_shortener.url_shortener.urls;

import com.url_shortener.url_shortener.users.Role;
import com.url_shortener.url_shortener.users.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.access.AccessDeniedException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UrlServiceTest {

    @Mock
    private UrlMapper urlMapper;

    @Mock
    private UrlRepository urlRepository;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private UrlService urlService;

    @Test
    void testShortenUrl_Success() {
        // Arrange
        UrlRequest request = new UrlRequest(
                "https://example.com/very-long-url",
                null,
                null,
                null,
                null,
                null
        );

        Url url = new Url();
        url.setLongUrl("https://example.com/very-long-url");

        when(urlMapper.toEntity(any())).thenReturn(url);
        when(urlRepository.save(any(Url.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UrlSend expectedSend = new UrlSend(
                "https://example.com/very-long-url",
                "SOMEHASH",
                null,
                null,
                true,
                false,
                null
        );
        when(urlMapper.toSendDto(any(Url.class))).thenReturn(expectedSend);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        // Act
        UrlSend result = urlService.generateShortUrl(request);

        // Assert
        assertNotNull(result);
        assertEquals("https://example.com/very-long-url", result.getLongUrl());
        verify(urlRepository, times(2)).save(any(Url.class));
    }

    @Test
    void testShortenUrl_CustomAliasAlreadyExists() {
        // Arrange
        UrlRequest request = new UrlRequest(
                "https://example.com",
                "my-brand",
                null,
                null,
                null,
                null
        );

        when(urlRepository.existsUrlByShortUrl("my-brand")).thenReturn(true);

        // Act & Assert
        assertThrows(AliasAlreadyExistsException.class, () -> {
            urlService.generateShortUrl(request);
        });

        verify(urlRepository, never()).save(any(Url.class));
    }

    @Test
    void testUpdateUrl_AccessDenied() {
        // Arrange
        User owner = new User();
        owner.setId(1L);
        owner.setRole(Role.USER);

        Url existingUrl = new Url();
        existingUrl.setShortUrl("hash123");
        existingUrl.setUser(owner);
        existingUrl.setActive(true);

        User currentUser = new User();
        currentUser.setId(2L);
        currentUser.setRole(Role.USER);

        UrlUpdateRequestDto requestDto = new UrlUpdateRequestDto();
        requestDto.setLongUrl("https://new-url.com");

        when(urlRepository.findByShortUrl("hash123")).thenReturn(existingUrl);

        // Act & Assert
        assertThrows(AccessDeniedException.class, () -> {
            urlService.updateUrl("hash123", requestDto, currentUser);
        });

        verify(urlRepository, never()).save(any(Url.class));
    }
}
