package com.url_shortener.url_shortener.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BlockedIpServiceTest {

    @Mock
    private BlockedIpRepository blockedIpRepository;

    @InjectMocks
    private BlockedIpService blockedIpService;

    @Test
    void isIpBlocked_MatchesExactIp() {
        BlockedIp blocked = BlockedIp.builder()
                .id(1L)
                .ipAddress("192.168.1.50")
                .reason("Test block")
                .build();
        when(blockedIpRepository.findAll()).thenReturn(List.of(blocked));

        blockedIpService.reloadMatchers();

        assertThat(blockedIpService.isIpBlocked("192.168.1.50")).isTrue();
        assertThat(blockedIpService.isIpBlocked("192.168.1.51")).isFalse();
    }

    @Test
    void isIpBlocked_MatchesCidrSubnet() {
        BlockedIp blocked = BlockedIp.builder()
                .id(2L)
                .ipAddress("10.50.0.0/16")
                .reason("Bot subnet block")
                .build();
        when(blockedIpRepository.findAll()).thenReturn(List.of(blocked));

        blockedIpService.reloadMatchers();

        assertThat(blockedIpService.isIpBlocked("10.50.12.34")).isTrue();
        assertThat(blockedIpService.isIpBlocked("10.51.0.1")).isFalse();
    }

    @Test
    void blockIp_InvalidFormat_ThrowsIllegalArgument() {
        assertThatThrownBy(() -> blockedIpService.blockIp("invalid-ip-string", "reason", "admin"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid IP address or CIDR format");
    }

    @Test
    void blockIp_Valid_SavesAndReloads() {
        when(blockedIpRepository.existsByIpAddress("172.16.0.1")).thenReturn(false);
        when(blockedIpRepository.save(any(BlockedIp.class))).thenAnswer(i -> i.getArgument(0));

        BlockedIp saved = blockedIpService.blockIp("172.16.0.1", "Scraper", "root");

        assertThat(saved.getIpAddress()).isEqualTo("172.16.0.1");
        verify(blockedIpRepository).save(any(BlockedIp.class));
    }
}
