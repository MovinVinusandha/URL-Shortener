package com.url_shortener.url_shortener.services;

import com.url_shortener.url_shortener.dtos.UpdateUserRequest;
import com.url_shortener.url_shortener.dtos.UserDto;
import com.url_shortener.url_shortener.dtos.UserRegister;
import com.url_shortener.url_shortener.entities.User;
import com.url_shortener.url_shortener.mappers.UserMapper;
import com.url_shortener.url_shortener.repositories.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

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

    public List<UserDto> getAllUsers(String sortBy) {
        if (!Set.of("name", "email", "id").contains(sortBy))
            sortBy = "id";

        return userRepository.findAll(Sort.by(sortBy))
                .stream()
                .map(userMapper::toDto)
                .toList();
    }

    public User updateUser(Long id, UpdateUserRequest request) {
        var user = userRepository.findById(id).orElse(null);

        userMapper.update(request, user);
        userRepository.save(user);
        return user;
    }

    public void deleteUser(Long id) {
        var user = userRepository.findById(id).orElse(null);

        userRepository.delete(user);
    }
}
