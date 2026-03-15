package com.url_shortener.url_shortener.urls;

public class LinkExpiredException extends RuntimeException {
    public LinkExpiredException() {
        super("This link has expired and is no longer available.");
    }
}
