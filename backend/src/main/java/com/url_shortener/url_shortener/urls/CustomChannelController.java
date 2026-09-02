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
@RequestMapping("/custom-channels")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated() and hasAnyRole('USER', 'ADMIN', 'ROOT')")
public class CustomChannelController {

    private final CustomChannelService customChannelService;
    private final UserRepository userRepository;

    @GetMapping
    @Operation(summary = "Get all saved custom channels for the authenticated user")
    public List<CustomChannelDto> getUserCustomChannels(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return customChannelService.getUserCustomChannels(userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Save a new custom channel preset")
    public CustomChannelDto createCustomChannel(
            @Valid @RequestBody CustomChannelRequest request,
            Authentication authentication
    ) {
        Long userId = (Long) authentication.getPrincipal();
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);
        return customChannelService.createCustomChannel(request, user);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a saved custom channel preset")
    public void deleteCustomChannel(
            @PathVariable Long id,
            Authentication authentication
    ) {
        Long userId = (Long) authentication.getPrincipal();
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);
        customChannelService.deleteCustomChannel(id, user);
    }
}
