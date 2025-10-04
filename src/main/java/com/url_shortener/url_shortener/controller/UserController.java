package com.url_shortener.url_shortener.controller;

import com.url_shortener.url_shortener.dtos.UserDto;
import com.url_shortener.url_shortener.dtos.UserRegister;
import com.url_shortener.url_shortener.mappers.UserMapper;
import com.url_shortener.url_shortener.services.UserService;
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
    public ResponseEntity<UserDto> registerUser(@RequestBody UserRegister userRegister) {
        var userDto = userService.registerUser(userRegister);
        return ResponseEntity.ok(userDto);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUser(@PathVariable Long id) {
        var user = userService.getUser(id);
        return ResponseEntity.ok(userMapper.toDto(user));
    }

    @GetMapping
    public Iterable<UserDto> getAllUsers() {
        return userService.getAllUsers();
    }
}
