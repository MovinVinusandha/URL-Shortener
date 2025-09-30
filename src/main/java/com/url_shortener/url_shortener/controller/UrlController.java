package com.url_shortener.url_shortener.controller;

import com.url_shortener.url_shortener.dtos.UrlDto;
import com.url_shortener.url_shortener.dtos.UrlRequest;
import com.url_shortener.url_shortener.exception.UrlExistInDataBaseException;
import com.url_shortener.url_shortener.exception.UrlNotFoundException;
import com.url_shortener.url_shortener.services.UrlService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@AllArgsConstructor
public class UrlController {
    
    private final UrlService urlService;

    @PostMapping("/shorten")
    public ResponseEntity<UrlDto> generateShortUrl(@Valid @RequestBody UrlRequest urlRequest) {

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

    @PutMapping("/url/{hash}")
    public ResponseEntity<UrlDto> updateUrl(
            @PathVariable String hash,
            @Valid @RequestBody UrlRequest urlRequest
    ) {

        var urlDto = urlService.updateUrl(urlRequest, hash);
        return ResponseEntity.ok(urlDto);
    }

    @DeleteMapping("/url/{hash}")
    public ResponseEntity<Void> deleteUrl(@PathVariable String hash) {

        urlService.deleteUrl(hash);
        return ResponseEntity.noContent().build();
    }


    @ExceptionHandler(UrlNotFoundException.class)
    public ResponseEntity<String> urlNotFound() {
        return ResponseEntity.notFound().build();
    }

    @ExceptionHandler(UrlExistInDataBaseException.class)
    public ResponseEntity<Map<String, String >> urlInDb() {
        return ResponseEntity.badRequest().body(
                Map.of("longUrl", "This URL has already been shortened")
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationErrors(
            MethodArgumentNotValidException exception
    ) {
        var errors = new HashMap<String, String>();

        exception.getBindingResult().getFieldErrors().forEach(error ->
                errors.put(error.getField(), error.getDefaultMessage())
        );

        return ResponseEntity.badRequest().body(errors);
    }
}
