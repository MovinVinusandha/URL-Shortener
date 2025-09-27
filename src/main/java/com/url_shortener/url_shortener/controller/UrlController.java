package com.url_shortener.url_shortener.controller;

import com.url_shortener.url_shortener.dtos.UrlDto;
import com.url_shortener.url_shortener.dtos.UrlRequest;
import com.url_shortener.url_shortener.services.UrlService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@AllArgsConstructor
public class UrlController {
    
    private final UrlService urlService;

    @PostMapping("/shorten")
    public ResponseEntity<UrlDto> generateShortUrl(@RequestBody UrlRequest urlRequest) {

        var urlDto = urlService.generateShortUrl(urlRequest);
        return ResponseEntity.ok(urlDto);
    }
}
