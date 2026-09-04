package com.url_shortener.url_shortener.urls;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkUrlActionRequestDto {
    @NotEmpty(message = "At least one URL hash must be provided")
    private List<String> hashes;

    @NotBlank(message = "Action is required")
    private String action; // MOVE_FOLDER, ADD_TAGS, SET_EXPIRATION, TOGGLE_STATUS, DELETE

    private Long folderId;
    private List<Long> tagIds;
    private LocalDateTime expiresAt;
    private Boolean disabled;
}
