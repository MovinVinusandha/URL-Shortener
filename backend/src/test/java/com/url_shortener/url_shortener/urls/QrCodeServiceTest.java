package com.url_shortener.url_shortener.urls;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class QrCodeServiceTest {

    private final QrCodeService qrCodeService = new QrCodeService();

    @Test
    void generateQrCode_Success() {
        byte[] qrCode = qrCodeService.generateQrCode("https://example.com", 256, 256);
        
        assertThat(qrCode).isNotNull();
        assertThat(qrCode).isNotEmpty();
    }
}
