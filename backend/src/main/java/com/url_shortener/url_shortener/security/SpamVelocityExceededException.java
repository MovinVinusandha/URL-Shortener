package com.url_shortener.url_shortener.security;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
public class SpamVelocityExceededException extends RuntimeException {
    public SpamVelocityExceededException(String message) {
        super(message);
    }
}
