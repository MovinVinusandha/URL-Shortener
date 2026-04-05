package com.url_shortener.url_shortener.analytics;

import com.url_shortener.url_shortener.urls.Url;
import com.url_shortener.url_shortener.urls.UrlRepository;
import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class ClickEventRepositoryTest {

    @Autowired
    private ClickEventRepository clickEventRepository;

    @Autowired
    private UrlRepository urlRepository;

    @Autowired
    private UserRepository userRepository;

    private User testUser;
    private Url testUrl;

    @BeforeEach
    void setUp() {
        testUser = User.builder().email("test@example.com").password("pass").build();
        userRepository.save(testUser);

        testUrl = Url.builder().shortUrl("hash123").longUrl("https://example.com").user(testUser).build();
        urlRepository.save(testUrl);

        ClickEvent event1 = ClickEvent.builder().url(testUrl).timestamp(LocalDateTime.now().minusDays(1))
                .country("US").device("Desktop").browser("Chrome").ipAddress("1234").build();
        ClickEvent event2 = ClickEvent.builder().url(testUrl).timestamp(LocalDateTime.now())
                .country("US").device("Mobile").browser("Safari").ipAddress("1235").build();

        clickEventRepository.saveAll(List.of(event1, event2));
    }

    @Test
    void countOverallClicksByCountry_Success() {
        List<Object[]> results = clickEventRepository.countOverallClicksByCountry(testUser.getId(), LocalDateTime.now().minusDays(2));
        
        assertThat(results).hasSize(1);
        assertThat(results.get(0)[0]).isEqualTo("US");
        assertThat(((Number) results.get(0)[1]).longValue()).isEqualTo(2L);
    }
    
    @Test
    void countOverallClicksByDate_Success() {
        List<Object[]> results = clickEventRepository.countOverallClicksByDate(testUser.getId(), LocalDateTime.now().minusDays(2));
        assertThat(results).isNotEmpty();
    }
    
    @Test
    void countByDeviceForUrl_Success() {
        List<Object[]> results = clickEventRepository.countByDeviceForUrl(testUrl.getId(), LocalDateTime.now().minusDays(2));
        assertThat(results).hasSize(2);
    }
}
