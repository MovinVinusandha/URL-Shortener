package com.url_shortener.url_shortener.dtos;

import jakarta.annotation.Nullable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@AllArgsConstructor
@Getter
@Setter
public class UpdateUserRequest {
    @Nullable
    private String name;

    @Nullable
    private String email;
}
