package com.url_shortener.url_shortener.services;

import com.url_shortener.url_shortener.dtos.UserDto;
import com.url_shortener.url_shortener.dtos.UserRegister;
import com.url_shortener.url_shortener.entities.User;
import com.url_shortener.url_shortener.mappers.UserMapper;
import com.url_shortener.url_shortener.repositories.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@AllArgsConstructor
public class UserService {
    private UserMapper userMapper;
    private UserRepository userRepository;

    public UserDto registerUser(UserRegister userRegister) {
        var user = userMapper.toEntity(userRegister);
        userRepository.save(user);
        return userMapper.toDto(user);
    }

    public User getUser(Long id) {
        return userRepository.findById(id).orElse(null);
    }

    public List<UserDto> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(userMapper::toDto)
                .toList();
    }
}
