package com.url_shortener.url_shortener.urls;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class TagDto {
    private Long id;
    private String name;
    private String color;
    private int linkCount;
}
