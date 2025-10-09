package com.url_shortener.url_shortener.controller;

import com.url_shortener.url_shortener.dtos.UpdateUserRequest;
import com.url_shortener.url_shortener.dtos.UserDto;
import com.url_shortener.url_shortener.dtos.UserRegister;
import com.url_shortener.url_shortener.mappers.UserMapper;
import com.url_shortener.url_shortener.services.UserService;
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
    public ResponseEntity<UserDto> updateUser(@PathVariable(name = "id") Long id, @RequestBody UpdateUserRequest request) {
        var user = userService.updateUser(id, request);
        return ResponseEntity.ok(userMapper.toDto(user));
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteUser() {
        userService.deleteUser();
        return ResponseEntity.noContent().build();
    }
}
