package com.url_shortener.url_shortener.urls;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/tags")
public class TagController {

    private final TagService tagService;

    @GetMapping
    @Operation(summary = "Get all tags for the authenticated user")
    public ResponseEntity<List<TagDto>> getAllTags() {
        return ResponseEntity.ok(tagService.getAllTagsForUser());
    }

    @PostMapping
    @Operation(summary = "Create a new tag")
    public ResponseEntity<TagDto> createTag(@RequestBody @Valid TagRequest request) {
        return new ResponseEntity<>(tagService.createTag(request), HttpStatus.CREATED);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a tag by ID")
    public ResponseEntity<Void> deleteTag(@PathVariable Long id) {
        tagService.deleteTag(id);
        return ResponseEntity.noContent().build();
    }
}
