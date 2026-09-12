package com.url_shortener.url_shortener.security;

import com.url_shortener.url_shortener.admin.BlacklistedDomain;
import com.url_shortener.url_shortener.admin.BlacklistedDomainRepository;
import com.url_shortener.url_shortener.admin.SystemSettingRepository;
import com.url_shortener.url_shortener.security.dto.ThreatScanResultDto;
import com.url_shortener.url_shortener.urls.UrlRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ThreatScannerServiceTest {

    @Mock
    private BlacklistedDomainRepository blacklistedDomainRepository;
    @Mock
    private SystemSettingRepository systemSettingRepository;
    @Mock
    private SecurityIncidentRepository incidentRepository;
    @Mock
    private UrlRepository urlRepository;
    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private CacheManager cacheManager;

    @InjectMocks
    private ThreatScannerService threatScannerService;

    @BeforeEach
    void setUp() {
        when(blacklistedDomainRepository.findAll()).thenReturn(Collections.emptyList());
    }

    @Test
    void scanUrl_CleanUrl_ReturnsSafe() {
        ThreatScanResultDto result = threatScannerService.scanUrl("https://github.com/example/repo");

        assertThat(result.isSafe()).isTrue();
        assertThat(result.getRiskScore()).isLessThanOrEqualTo(20);
        assertThat(result.getThreatType()).isEqualTo("CLEAN");
        assertThat(result.getDetectedThreats()).isEmpty();
    }

    @Test
    void scanUrl_ExecutableExtension_FlagsMalware() {
        ThreatScanResultDto result = threatScannerService.scanUrl("https://updates.download-center.org/installer.exe");

        assertThat(result.isSafe()).isFalse();
        assertThat(result.getRiskScore()).isGreaterThanOrEqualTo(70);
        assertThat(result.getThreatType()).isEqualTo("MALWARE_PAYLOAD");
        assertThat(result.getDetectedThreats()).anyMatch(t -> t.contains(".exe"));
    }

    @Test
    void scanUrl_DirectIpHolder_FlagsSuspicious() {
        ThreatScanResultDto result = threatScannerService.scanUrl("http://192.168.1.100/resource");

        assertThat(result.isSafe()).isFalse();
        assertThat(result.getThreatType()).isEqualTo("RAW_IP_HOST");
        assertThat(result.getDetectedThreats()).anyMatch(t -> t.contains("Direct IP address"));
    }

    @Test
    void scanUrl_PunycodeDomain_FlagsHomograph() {
        ThreatScanResultDto result = threatScannerService.scanUrl("https://xn--pple-43d.com/login");

        assertThat(result.isSafe()).isFalse();
        assertThat(result.getThreatType()).isEqualTo("HOMOGRAPH_SPOOFING");
    }

    @Test
    void scanUrl_BlacklistedDomain_FlagsImmediately() {
        BlacklistedDomain blocked = BlacklistedDomain.builder()
                .domainPattern("*.phishing-lure.xyz")
                .reason("Known credential harvester")
                .build();
        when(blacklistedDomainRepository.findAll()).thenReturn(List.of(blocked));

        ThreatScanResultDto result = threatScannerService.scanUrl("https://login.phishing-lure.xyz/account");

        assertThat(result.isSafe()).isFalse();
        assertThat(result.getRiskScore()).isEqualTo(100);
        assertThat(result.getThreatType()).isEqualTo("BLACKLISTED_DOMAIN");
    }
}
