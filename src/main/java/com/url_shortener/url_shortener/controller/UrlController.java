package com.url_shortener.url_shortener.controller;

import com.url_shortener.url_shortener.dtos.UrlDto;
import com.url_shortener.url_shortener.dtos.UrlSend;
import com.url_shortener.url_shortener.dtos.UrlRequest;
import com.url_shortener.url_shortener.dtos.UrlUpdateDto;
import com.url_shortener.url_shortener.exception.UrlExistInDataBaseException;
import com.url_shortener.url_shortener.exception.UrlNotFoundException;
import com.url_shortener.url_shortener.services.UrlService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@AllArgsConstructor
public class UrlController {
    
    private final UrlService urlService;

    @PostMapping("/shorten")
    public ResponseEntity<UrlSend> generateShortUrl(@Valid @RequestBody UrlRequest urlRequest) {

        var urlDto = urlService.generateShortUrl(urlRequest);
        return ResponseEntity.ok(urlDto);
    }

    @GetMapping("/{shortUrl}")
    public ResponseEntity<Void> redirectToNewUrl(@PathVariable String shortUrl) {
        var url = urlService.urlRedirect(shortUrl);

        HttpHeaders headers = new HttpHeaders();
        headers.add("Location", url.getLongUrl());
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    @GetMapping("/url/{hash}")
    public ResponseEntity<UrlDto> getUrl(@PathVariable String hash) {
        var urlDto = urlService.getUrl(hash);
        return ResponseEntity.ok(urlDto);
    }

    @PutMapping("/url/{hash}")
    public ResponseEntity<UrlUpdateDto> updateUrl(
            @PathVariable String hash,
            @Valid @RequestBody UrlRequest urlRequest
    ) {

        var urlUpdateDto = urlService.updateUrl(urlRequest, hash);
        return ResponseEntity.ok(urlUpdateDto);
    }

    @DeleteMapping("/url/{hash}")
    public ResponseEntity<Void> deleteUrl(@PathVariable String hash) {

        urlService.deleteUrl(hash);
        return ResponseEntity.noContent().build();
    }
}
