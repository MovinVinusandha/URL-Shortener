package com.url_shortener.url_shortener.urls;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.url_shortener.url_shortener.analytics.AnalyticsService;
import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UrlController.class)
@AutoConfigureMockMvc(addFilters = false)
class UrlControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UrlService urlService;
    @MockBean
    private AnalyticsService analyticsService;
    @MockBean
    private QrCodeService qrCodeService;
    @MockBean
    private UserRepository userRepository;
    @MockBean
    private com.url_shortener.url_shortener.auth.JwtService jwtService;

    @Autowired
    private UrlController urlController;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void generateShortUrl_Success_Anonymous() throws Exception {
        UrlRequest request = new UrlRequest("https://example.com", null, null, null, null, null);
        UrlSend urlSend = new UrlSend("https://example.com", "hash123", null, null, true, false, null, null, null);
        when(urlService.generateShortUrl(any(UrlRequest.class))).thenReturn(urlSend);

        mockMvc.perform(post("/shorten")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shortUrl").value("hash123"))
                .andExpect(jsonPath("$.longUrl").value("https://example.com"));
    }

    @Test
    void generateShortUrl_WithCustomAlias_Unauthenticated_ThrowsAccessDenied() {
        UrlRequest request = new UrlRequest("https://example.com", "my-alias", null, null, null, null);

        assertThatThrownBy(() -> urlController.generateShortUrl(request))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("You must be logged in to use a custom alias");
    }

    @Test
    void generateShortUrl_WithExpiresAt_Unauthenticated_ThrowsAccessDenied() {
        UrlRequest request = new UrlRequest("https://example.com", null, LocalDateTime.now().plusDays(1), null, null, null);

        assertThatThrownBy(() -> urlController.generateShortUrl(request))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("You must be logged in to set an expiration date");
    }

    @Test
    void generateShortUrl_WithCustomAliasAndExpiresAt_Authenticated_Success() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(1L, null, Collections.emptyList())
        );

        UrlRequest request = new UrlRequest("https://example.com", "my-alias", null, null, null, null);
        UrlSend urlSend = new UrlSend("https://example.com", "my-alias", null, null, true, false, null, null, null);
        when(urlService.generateShortUrl(any(UrlRequest.class))).thenReturn(urlSend);

        mockMvc.perform(post("/shorten")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shortUrl").value("my-alias"));
    }

    @Test
    void redirectToNewUrl_Success_WithXForwardedFor() throws Exception {
        when(urlService.getLongUrlForRedirect("hash123")).thenReturn("https://example.com");

        mockMvc.perform(get("/hash123")
                .header("User-Agent", "Mozilla/5.0")
                .header("X-Forwarded-For", "203.0.113.195, 70.41.3.18"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "https://example.com"));

        verify(analyticsService).trackClick(eq("hash123"), eq("Mozilla/5.0"), eq("203.0.113.195"), any(), any());
    }

    @Test
    void redirectToNewUrl_Success_WithXRealIp() throws Exception {
        when(urlService.getLongUrlForRedirect("hash123")).thenReturn("https://example.com");

        mockMvc.perform(get("/hash123")
                .header("User-Agent", "Mozilla/5.0")
                .header("X-Real-IP", "198.51.100.1"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "https://example.com"));

        verify(analyticsService).trackClick(eq("hash123"), eq("Mozilla/5.0"), eq("198.51.100.1"), any(), any());
    }

    @Test
    void redirectToNewUrl_Success_DirectRemoteAddr() throws Exception {
        when(urlService.getLongUrlForRedirect("hash123")).thenReturn("https://example.com");

        mockMvc.perform(get("/hash123")
                .header("User-Agent", "Mozilla/5.0"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "https://example.com"));

        verify(analyticsService).trackClick(eq("hash123"), eq("Mozilla/5.0"), any(), any(), any());
    }

    @Test
    void redirectToNewUrl_PasswordProtected_RedirectsToSecure() throws Exception {
        when(urlService.getLongUrlForRedirect("sec123")).thenThrow(new PasswordProtectedException("sec123"));

        mockMvc.perform(get("/sec123"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", org.hamcrest.Matchers.endsWith("/secure/sec123")));
    }

    @Test
    void redirectToNewUrl_NotFound_RedirectsToCustomNotFoundPage() throws Exception {
        when(urlService.getLongUrlForRedirect("nonexistent")).thenThrow(new UrlNotFoundException());

        mockMvc.perform(get("/nonexistent"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", org.hamcrest.Matchers.endsWith("/not-found")));
    }

    @Test
    void unlockUrl_Success() throws Exception {
        UnlockRequest unlockRequest = new UnlockRequest();
        unlockRequest.setPassword("mySecret");
        when(urlService.getUrlForUnlock("sec123", "mySecret")).thenReturn("https://secret-destination.com");

        mockMvc.perform(post("/unlock/sec123")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(unlockRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.longUrl").value("https://secret-destination.com"));

        verify(analyticsService).trackClick(eq("sec123"), any(), any(), any(), any());
    }

    @Test
    void getUrl_Success() throws Exception {
        UrlDto urlDto = new UrlDto(BigInteger.ONE, "https://example.com", "hash123", BigInteger.valueOf(15L), null, null, null, true, false, null, null, null);
        when(urlService.getUrl("hash123")).thenReturn(urlDto);

        mockMvc.perform(get("/url/hash123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shortUrl").value("hash123"))
                .andExpect(jsonPath("$.accessed_times").value(15));
    }

    @Test
    void getAllUsers_WithFilters() throws Exception {
        mockMvc.perform(get("/url/all")
                .param("folderSlug", "marketing-2026")
                .param("tagId", "2")
                .param("search", "example"))
                .andExpect(status().isOk());

        verify(urlService).getAllUrls(eq(""), eq(2L), isNull(), eq("marketing-2026"), eq("example"));
    }

    @Test
    void updateUrl_Unauthenticated_ThrowsAccessDenied() {
        UrlUpdateRequestDto updateDto = new UrlUpdateRequestDto();
        updateDto.setLongUrl("https://new.com");

        assertThatThrownBy(() -> urlController.updateUrl("hash123", updateDto))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("You must be logged in to update a URL");
    }

    @Test
    void updateUrl_Success() throws Exception {
        User user = User.builder().id(1L).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        UrlUpdateRequestDto updateDto = new UrlUpdateRequestDto();
        updateDto.setLongUrl("https://new.com");

        UrlDto resultDto = new UrlDto(BigInteger.ONE, "https://new.com", "hash123", BigInteger.ZERO, null, null, null, true, false, null, null, null);
        when(urlService.updateUrl(eq("hash123"), any(UrlUpdateRequestDto.class), eq(user))).thenReturn(resultDto);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(1L, null, Collections.emptyList())
        );

        mockMvc.perform(put("/url/hash123")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.longUrl").value("https://new.com"));
    }

    @Test
    void deleteUrl_Success() throws Exception {
        mockMvc.perform(delete("/url/hash123"))
                .andExpect(status().isNoContent());

        verify(urlService).deleteUrl("hash123");
    }

    @Test
    void getQrCode_Success() throws Exception {
        UrlDto urlDto = new UrlDto(BigInteger.ONE, "https://example.com", "http://localhost/hash123", BigInteger.ZERO, null, null, null, true, false, null, null, null);
        when(urlService.getUrl("hash123")).thenReturn(urlDto);
        when(qrCodeService.generateQrCode("http://localhost/hash123", 300, 300)).thenReturn(new byte[]{1, 2, 3});

        mockMvc.perform(get("/url/hash123/qr"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG));
    }

    @Test
    void createBatchCampaignUrls_Success() throws Exception {
        User user = User.builder().id(1L).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        BatchChannelItemDto channel = BatchChannelItemDto.builder().name("Facebook").utmSource("facebook").utmMedium("social").build();
        BatchCampaignRequestDto request = BatchCampaignRequestDto.builder()
                .longUrl("https://example.com/shop")
                .campaignName("summer_sale")
                .channels(java.util.List.of(channel))
                .build();

        BatchCampaignResponseDto responseDto = BatchCampaignResponseDto.builder()
                .campaignName("summer_sale")
                .totalCreated(1)
                .items(java.util.List.of(BatchCampaignResultItemDto.builder()
                        .channelName("Facebook")
                        .shortUrl("abc12345")
                        .fullShortUrl("http://localhost/abc12345")
                        .longUrlWithUtm("https://example.com/shop?utm_source=facebook&utm_medium=social&utm_campaign=summer_sale")
                        .utmSource("facebook")
                        .utmMedium("social")
                        .build()))
                .build();

        when(urlService.createBatchCampaignUrls(any(BatchCampaignRequestDto.class), eq(user))).thenReturn(responseDto);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(1L, null, Collections.emptyList())
        );

        mockMvc.perform(post("/url/batch-campaign")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.campaignName").value("summer_sale"))
                .andExpect(jsonPath("$.totalCreated").value(1))
                .andExpect(jsonPath("$.items[0].channelName").value("Facebook"));
    }
}
