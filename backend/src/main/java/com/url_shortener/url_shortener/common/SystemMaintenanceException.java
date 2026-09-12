package com.url_shortener.url_shortener.common;

import lombok.Getter;

@Getter
public class SystemMaintenanceException extends RuntimeException {
    private final String shortUrl;

    public SystemMaintenanceException(String shortUrl) {
        super("The system is currently undergoing scheduled maintenance. Redirection is temporarily paused.");
        this.shortUrl = shortUrl;
    }

    public SystemMaintenanceException(String shortUrl, String message) {
        super(message);
        this.shortUrl = shortUrl;
    }
}
