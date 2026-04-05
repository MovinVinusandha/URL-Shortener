package com.url_shortener.url_shortener.urls;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.url_shortener.url_shortener.analytics.AnalyticsService;
import com.url_shortener.url_shortener.users.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
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

    @Test
    void generateShortUrl_Success() throws Exception {
        UrlRequest request = new UrlRequest("https://example.com", null, null, null, null, null);

        com.url_shortener.url_shortener.urls.UrlSend urlSend = new com.url_shortener.url_shortener.urls.UrlSend("https://example.com", "hash123", null, null, true, false, null);
        when(urlService.generateShortUrl(any(UrlRequest.class))).thenReturn(urlSend);

        mockMvc.perform(post("/shorten")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shortUrl").value("hash123"))
                .andExpect(jsonPath("$.longUrl").value("https://example.com"));
    }

    @Test
    void redirectToNewUrl_Success() throws Exception {
        when(urlService.getLongUrlForRedirect("hash123")).thenReturn("https://example.com");

        mockMvc.perform(get("/hash123")
                .header("User-Agent", "Mozilla/5.0"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "https://example.com"));

        verify(analyticsService).trackClick(any(), any(), any());
    }

    @Test
    void deleteUrl_Success() throws Exception {
        mockMvc.perform(delete("/url/hash123"))
                .andExpect(status().isNoContent());

        verify(urlService).deleteUrl("hash123");
    }
}
