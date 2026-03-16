package com.url_shortener.url_shortener.urls;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class TagAlreadyExistsException extends RuntimeException {
    public TagAlreadyExistsException(String message) {
        super(message);
    }
}
