package com.url_shortener.url_shortener.controller;

import com.url_shortener.url_shortener.exception.UrlExistInDataBaseException;
import com.url_shortener.url_shortener.exception.UrlNotFoundException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(UrlNotFoundException.class)
    public ResponseEntity<String> urlNotFound() {
        return ResponseEntity.notFound().build();
    }

    @ExceptionHandler(UrlExistInDataBaseException.class)
    public ResponseEntity<Map<String, String >> urlInDb() {
        return ResponseEntity.badRequest().body(
                Map.of("longUrl", "This URL has already been shortened")
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationErrors(
            MethodArgumentNotValidException exception
    ) {
        var errors = new HashMap<String, String>();

        exception.getBindingResult().getFieldErrors().forEach(error ->
                errors.put(error.getField(), error.getDefaultMessage())
        );

        return ResponseEntity.badRequest().body(errors);
    }
}
