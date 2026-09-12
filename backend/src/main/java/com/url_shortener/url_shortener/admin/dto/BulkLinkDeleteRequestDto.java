package com.url_shortener.url_shortener.admin.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkLinkDeleteRequestDto {
    @NotEmpty(message = "Hashes list cannot be empty")
    private List<String> hashes;
}
