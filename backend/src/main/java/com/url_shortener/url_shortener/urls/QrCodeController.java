package com.url_shortener.url_shortener.urls;

import lombok.AllArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/qr")
@AllArgsConstructor
public class QrCodeController {

    private final QrCodeService qrCodeService;

    @GetMapping("/preview")
    public ResponseEntity<byte[]> getQrCodePreview(@RequestParam("text") String text) {
        try {
            byte[] qrCodeImage = qrCodeService.generateQrCode(text, 200, 200);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.IMAGE_PNG);
            return new ResponseEntity<>(qrCodeImage, headers, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
