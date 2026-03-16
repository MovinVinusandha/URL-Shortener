package com.url_shortener.url_shortener.urls;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class FolderNotFoundException extends RuntimeException {
    public FolderNotFoundException() {
        super("Folder not found.");
    }
}
