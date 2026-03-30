package com.url_shortener.url_shortener.urls;

import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserNotFoundException;
import com.url_shortener.url_shortener.users.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/folders")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated() and hasAnyRole('USER', 'ADMIN', 'ROOT')")
public class FolderController {

    private final FolderService folderService;
    private final UserRepository userRepository;

    @GetMapping
    public List<FolderDto> getUserFolders(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return folderService.getUserFolders(userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FolderDto createFolder(@Valid @RequestBody FolderRequestDto request, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);
        return folderService.createFolder(request.getName(), user);
    }

    @PutMapping("/{id}")
    public FolderDto updateFolder(@PathVariable Long id, @Valid @RequestBody FolderRequestDto request, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);
        return folderService.updateFolder(id, request, user);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFolder(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);
        folderService.deleteFolder(id, user);
    }
}
