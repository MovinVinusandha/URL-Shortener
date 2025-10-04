package com.url_shortener.url_shortener.dtos;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public class UserRegister {
    private String name;
    private String email;
    private String password;
}
