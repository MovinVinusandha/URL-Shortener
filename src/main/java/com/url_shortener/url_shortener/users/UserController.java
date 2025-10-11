package com.url_shortener.url_shortener.users;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/user")
@AllArgsConstructor
public class UserController {
    private final UserMapper userMapper;
    private final UserService userService;

    @PostMapping
    public ResponseEntity<UserDto> registerUser(@Valid @RequestBody UserRegister userRegister) {
        var userDto = userService.registerUser(userRegister);
        return ResponseEntity.ok(userDto);
    }

    @GetMapping("/all")
    public Iterable<UserDto> getAllUsers(
            @RequestParam(required = false, defaultValue = "", name = "sort") String sortBy
    ) {
        return userService.getAllUsers(sortBy);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserDto> updateUser(
            @PathVariable(name = "id") Long id,
            @RequestBody UpdateUserRequest request
    ) {
        var user = userService.updateUser(id, request);
        return ResponseEntity.ok(userMapper.toDto(user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable(name = "id") Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
