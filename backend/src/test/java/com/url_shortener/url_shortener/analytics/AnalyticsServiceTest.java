package com.url_shortener.url_shortener.analytics;

import com.url_shortener.url_shortener.analytics.dto.AnalyticsResponseDto;
import com.url_shortener.url_shortener.urls.Folder;
import com.url_shortener.url_shortener.urls.FolderRepository;
import com.url_shortener.url_shortener.urls.Url;
import com.url_shortener.url_shortener.urls.UrlRepository;
import com.url_shortener.url_shortener.users.Role;
import com.url_shortener.url_shortener.users.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock
    private UrlRepository urlRepository;
    @Mock
    private FolderRepository folderRepository;
    @Mock
    private ClickEventRepository clickEventRepository;
    @Mock
    private UserAgentParserService userAgentParserService;
    @Mock
    private GeoLocationService geoLocationService;

    @InjectMocks
    private AnalyticsService analyticsService;

    private User currentUser;

    @BeforeEach
    void setUp() {
        currentUser = User.builder().id(1L).role(Role.USER).build();
    }

    @Test
    void getOverallAnalytics_With24hPeriod() {
        when(clickEventRepository.countTotalOverallClicks(eq(1L), any(LocalDateTime.class))).thenReturn(150L);
        when(clickEventRepository.countOverallClicksByDate(eq(1L), any(LocalDateTime.class))).thenReturn(Collections.emptyList());
        when(clickEventRepository.countOverallClicksByCountry(eq(1L), any(LocalDateTime.class))).thenReturn(Collections.emptyList());
        when(clickEventRepository.countOverallClicksByDevice(eq(1L), any(LocalDateTime.class))).thenReturn(Collections.emptyList());
        when(clickEventRepository.countOverallClicksByBrowser(eq(1L), any(LocalDateTime.class))).thenReturn(Collections.emptyList());

        AnalyticsResponseDto response = analyticsService.getOverallAnalytics(currentUser, "24h");

        assertThat(response).isNotNull();
        assertThat(response.getTotalClicks()).isEqualTo(150L);
    }

    @Test
    void getLinkAnalytics_Success() {
        Url url = Url.builder().id(100L).user(currentUser).build();
        when(urlRepository.findByShortUrl("hash123")).thenReturn(url);
        when(clickEventRepository.countByUrl_Id(eq(100L), any(LocalDateTime.class))).thenReturn(50L);
        when(clickEventRepository.countByDateForUrl(eq(100L), any(LocalDateTime.class))).thenReturn(Collections.emptyList());
        when(clickEventRepository.countByCountryForUrl(eq(100L), any(LocalDateTime.class))).thenReturn(Collections.emptyList());
        when(clickEventRepository.countByDeviceForUrl(eq(100L), any(LocalDateTime.class))).thenReturn(Collections.emptyList());
        when(clickEventRepository.countByBrowserForUrl(eq(100L), any(LocalDateTime.class))).thenReturn(Collections.emptyList());

        AnalyticsResponseDto response = analyticsService.getAnalytics("hash123", currentUser, "7d");

        assertThat(response).isNotNull();
        assertThat(response.getTotalClicks()).isEqualTo(50L);
    }

    @Test
    void getFolderAnalytics_Success() {
        Folder folder = Folder.builder().id(50L).user(currentUser).build();
        when(folderRepository.findById(50L)).thenReturn(Optional.of(folder));
        when(clickEventRepository.countTotalFolderClicks(eq(50L), eq(1L), any(LocalDateTime.class))).thenReturn(75L);
        when(clickEventRepository.countFolderClicksByDate(eq(50L), eq(1L), any(LocalDateTime.class))).thenReturn(Collections.emptyList());
        when(clickEventRepository.countFolderClicksByCountry(eq(50L), eq(1L), any(LocalDateTime.class))).thenReturn(Collections.emptyList());
        when(clickEventRepository.countFolderClicksByDevice(eq(50L), eq(1L), any(LocalDateTime.class))).thenReturn(Collections.emptyList());
        when(clickEventRepository.countFolderClicksByBrowser(eq(50L), eq(1L), any(LocalDateTime.class))).thenReturn(Collections.emptyList());

        AnalyticsResponseDto response = analyticsService.getFolderAnalytics(50L, currentUser, "all");

        assertThat(response).isNotNull();
        assertThat(response.getTotalClicks()).isEqualTo(75L);
    }
}
