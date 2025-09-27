package com.url_shortener.url_shortener.exception;

public class UrlExistInDataBaseException extends RuntimeException {
    @Override
    public String getMessage() {
        return "Entered url already exists in the database";
    }
}
