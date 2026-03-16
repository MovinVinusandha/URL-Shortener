package com.url_shortener.url_shortener.urls;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class FolderAlreadyExistsException extends RuntimeException {
    public FolderAlreadyExistsException() {
        super("A folder with this name already exists.");
    }
}
