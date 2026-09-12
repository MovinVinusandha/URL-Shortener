package com.url_shortener.url_shortener.users;

import com.url_shortener.url_shortener.common.RateLimiterService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/user")
public class UserController {
    private final UserMapper userMapper;
    private final UserService userService;
    private final RateLimiterService rateLimiterService;
    private final com.url_shortener.url_shortener.admin.SystemSettingRepository systemSettingRepository;

    @org.springframework.beans.factory.annotation.Value("${app.allow-registration:true}")
    private boolean allowRegistration;

    public UserController(UserMapper userMapper,
                          UserService userService,
                          RateLimiterService rateLimiterService,
                          com.url_shortener.url_shortener.admin.SystemSettingRepository systemSettingRepository) {
        this.userMapper = userMapper;
        this.userService = userService;
        this.rateLimiterService = rateLimiterService;
        this.systemSettingRepository = systemSettingRepository;
    }

    @PostMapping
    public ResponseEntity<?> registerUser(@Valid @RequestBody UserRegister userRegister, HttpServletRequest request) {
        boolean dynamicAllowRegistration = systemSettingRepository.findBySettingKey("ALLOW_REGISTRATION")
                .map(s -> Boolean.parseBoolean(s.getSettingValue()))
                .orElse(allowRegistration);

        if (!dynamicAllowRegistration) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Account registration is disabled on this instance. Please contact your administrator."));
        }

        String clientIp = extractClientIp(request);
        if (!rateLimiterService.checkRegistration(clientIp)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Too many account registrations from this network. Please try again later."));
        }
        var userDto = userService.registerUser(userRegister);
        return ResponseEntity.ok(userDto);
    }

    @GetMapping("/all")
    public Iterable<UserDto> getAllUsers(
            @RequestParam(required = false, defaultValue = "", name = "sort") String sortBy
    ) {
        return userService.getAllUsers(sortBy);
    }

    @PutMapping("/{publicId}")
    public ResponseEntity<UserDto> updateUser(
            @PathVariable(name = "publicId") String publicId,
            @RequestBody UpdateUserRequest request
    ) {
        var user = userService.updateUser(publicId, request);
        return ResponseEntity.ok(userMapper.toDto(user));
    }

    @DeleteMapping("/{publicId}")
    public ResponseEntity<Void> deleteUser(@PathVariable(name = "publicId") String publicId) {
        userService.deleteUser(publicId);
        return ResponseEntity.noContent().build();
    }

    private String extractClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
