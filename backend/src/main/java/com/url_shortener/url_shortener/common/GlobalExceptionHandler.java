package com.url_shortener.url_shortener.common;

import com.url_shortener.url_shortener.urls.UrlExistInDataBaseException;
import com.url_shortener.url_shortener.urls.UrlNotFoundException;
import com.url_shortener.url_shortener.users.UserAlreadyExist;
import com.url_shortener.url_shortener.users.UserNotFoundException;
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

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<String> userNotFound() {
        return ResponseEntity.notFound().build();
    }

    @org.springframework.beans.factory.annotation.Value("${app.frontend.url:http://localhost}")
    private String frontendUrl;

    @ExceptionHandler(com.url_shortener.url_shortener.urls.LinkExpiredException.class)
    public void linkExpired(com.url_shortener.url_shortener.urls.LinkExpiredException ex, jakarta.servlet.http.HttpServletResponse response) throws java.io.IOException {
        response.sendRedirect(frontendUrl + "/expired");
    }

    @ExceptionHandler(UrlExistInDataBaseException.class)
    public ResponseEntity<Map<String, String >> urlInDb() {
        return ResponseEntity.badRequest().body(
                Map.of("longUrl", "This URL has already been shortened")
        );
    }

    @ExceptionHandler(UserAlreadyExist.class)
    public ResponseEntity<Map<String, String >> userAlreadyRegistered() {
        return ResponseEntity.badRequest().body(
                Map.of("longUrl", "This User has already been registered")
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
