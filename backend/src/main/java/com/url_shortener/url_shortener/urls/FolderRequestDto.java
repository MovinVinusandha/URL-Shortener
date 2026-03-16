package com.url_shortener.url_shortener.urls;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class FolderRequestDto {
    @NotBlank(message = "Folder name is required")
    private String name;
}
