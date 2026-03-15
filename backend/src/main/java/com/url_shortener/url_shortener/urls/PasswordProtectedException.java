package com.url_shortener.url_shortener.urls;

public class PasswordProtectedException extends RuntimeException {
    private final String hash;

    public PasswordProtectedException(String hash) {
        super("This URL is password protected.");
        this.hash = hash;
    }

    public String getHash() {
        return hash;
    }
}
