package com.url_shortener.url_shortener.urls;

import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserNotFoundException;
import com.url_shortener.url_shortener.users.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/utm-templates")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated() and hasAnyRole('USER', 'ADMIN', 'ROOT')")
public class UtmTemplateController {

    private final UtmTemplateService utmTemplateService;
    private final UserRepository userRepository;

    @GetMapping
    @Operation(summary = "Get all UTM templates for the authenticated user")
    public List<UtmTemplateDto> getUserTemplates(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return utmTemplateService.getUserTemplates(userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new UTM template")
    public UtmTemplateDto createTemplate(@Valid @RequestBody UtmTemplateRequest request, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);
        return utmTemplateService.createTemplate(request, user);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing UTM template")
    public UtmTemplateDto updateTemplate(
            @PathVariable Long id,
            @Valid @RequestBody UtmTemplateRequest request,
            Authentication authentication
    ) {
        Long userId = (Long) authentication.getPrincipal();
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);
        return utmTemplateService.updateTemplate(id, request, user);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a UTM template by ID")
    public void deleteTemplate(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);
        utmTemplateService.deleteTemplate(id, user);
    }
}
