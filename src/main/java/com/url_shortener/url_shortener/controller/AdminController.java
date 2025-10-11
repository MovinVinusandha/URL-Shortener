package com.url_shortener.url_shortener.controller;

import com.url_shortener.url_shortener.users.UserDto;
import com.url_shortener.url_shortener.users.UserRegister;
import com.url_shortener.url_shortener.users.Role;
import com.url_shortener.url_shortener.users.UserAlreadyExist;
import com.url_shortener.url_shortener.users.UserMapper;
import com.url_shortener.url_shortener.users.UserRepository;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin")
@AllArgsConstructor
public class AdminController {
    private final UserMapper userMapper;
    private final UserRepository userRepository;
    private PasswordEncoder passwordEncoder;

    @PostMapping("/addNew")
    public ResponseEntity<UserDto> addNewAdmin(@Valid @RequestBody UserRegister userRegister) {
        if (userRepository.existsUserByEmail(userRegister.getEmail())) {
            throw new UserAlreadyExist();
        }

        var user = userMapper.toEntity(userRegister);
        user.setPassword(passwordEncoder.encode(userRegister.getPassword()));
        user.setRole(Role.ADMIN);
        userRepository.save(user);

        return ResponseEntity.ok(userMapper.toDto(user));
    }
}
