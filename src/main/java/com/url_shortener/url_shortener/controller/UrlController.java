package com.url_shortener.url_shortener.controller;

import com.url_shortener.url_shortener.dtos.UrlDto;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@AllArgsConstructor
public class UrlController {

    @PostMapping("/shorten")
    public UrlDto generateShortUrl(@RequestBody UrlDto longUrl) {
        return longUrl;
    }
}
