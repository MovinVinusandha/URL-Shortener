package com.url_shortener.url_shortener.urls;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(code = HttpStatus.CONFLICT, reason = "This custom alias is already taken. Please choose another one.")
public class AliasAlreadyExistsException extends RuntimeException {
}
