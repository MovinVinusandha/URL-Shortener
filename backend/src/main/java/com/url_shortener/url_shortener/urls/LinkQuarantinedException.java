package com.url_shortener.url_shortener.urls;

import lombok.Getter;

@Getter
public class LinkQuarantinedException extends RuntimeException {
    private final String shortUrl;
    private final String reason;

    public LinkQuarantinedException(String shortUrl, String reason) {
        super("This link has been blocked by administrators for security policy violations.");
        this.shortUrl = shortUrl;
        this.reason = reason;
    }
}
