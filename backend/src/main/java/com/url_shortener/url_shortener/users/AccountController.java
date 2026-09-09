package com.url_shortener.url_shortener.users;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users/me")
@AllArgsConstructor
public class AccountController {

    private final UserService userService;
    private final UserMapper userMapper;

    @PutMapping
    public ResponseEntity<UserDto> updateMe(@Valid @RequestBody UserUpdateRequestDto request) {
        var user = userService.updateMe(request);
        return ResponseEntity.ok(userMapper.toDto(user));
    }

    @PutMapping("/password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody PasswordChangeRequestDto request) {
        userService.changePassword(request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/password")
    public ResponseEntity<Void> setInitialPassword(@Valid @RequestBody PasswordSetRequestDto request) {
        userService.setInitialPassword(request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/oauth-accounts")
    public ResponseEntity<List<OAuthAccountDto>> getOAuthAccounts() {
        return ResponseEntity.ok(userService.getConnectedOAuthAccounts());
    }

    @DeleteMapping("/oauth-accounts/{provider}")
    public ResponseEntity<Void> unlinkOAuthAccount(@PathVariable("provider") String provider) {
        userService.unlinkOAuthAccount(provider);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteMe() {
        userService.deleteMe();
        return ResponseEntity.noContent().build();
    }
}
