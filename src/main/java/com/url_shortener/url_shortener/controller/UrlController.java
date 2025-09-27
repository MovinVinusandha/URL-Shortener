package com.url_shortener.url_shortener.controller;

import com.url_shortener.url_shortener.dtos.UrlDto;
import com.url_shortener.url_shortener.dtos.UrlRequest;
import com.url_shortener.url_shortener.exception.UrlExistInDataBaseException;
import com.url_shortener.url_shortener.exception.UrlNotFoundException;
import com.url_shortener.url_shortener.services.UrlService;
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
    public ResponseEntity<UrlDto> generateShortUrl(@RequestBody UrlRequest urlRequest) {

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

    @ExceptionHandler(UrlNotFoundException.class)
    public ResponseEntity<String> urlNotFound() {
        return ResponseEntity.notFound().build();
    }

    @ExceptionHandler(UrlExistInDataBaseException.class)
    public ResponseEntity<String> urlInDb(UrlExistInDataBaseException urlExistInDataBaseException) {
        return ResponseEntity.badRequest().body(urlExistInDataBaseException.getMessage());
    }
}
