package com.url_shortener.url_shortener.services;

import com.url_shortener.url_shortener.dtos.UpdateUserRequest;
import com.url_shortener.url_shortener.dtos.UserDto;
import com.url_shortener.url_shortener.dtos.UserRegister;
import com.url_shortener.url_shortener.entities.Role;
import com.url_shortener.url_shortener.entities.User;
import com.url_shortener.url_shortener.exception.UserAlreadyExist;
import com.url_shortener.url_shortener.exception.UserNotFoundException;
import com.url_shortener.url_shortener.mappers.UserMapper;
import com.url_shortener.url_shortener.repositories.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Service
@AllArgsConstructor
public class UserService {
    private UserMapper userMapper;
    private UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserDto registerUser(UserRegister userRegister) {
        isUserExistInDatabase(userRegister.getEmail());

        var user = userMapper.toEntity(userRegister);
        user.setPassword(passwordEncoder.encode(userRegister.getPassword()));
        user.setRole(Role.USER);
        userRepository.save(user);
        return userMapper.toDto(user);
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
        var userId = getUserId();

        isIdIdentical(id, userId);

        var user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            throw new UserNotFoundException();
        }

        if (userRepository.existsUserByEmail(request.getEmail()) && !(user.getEmail().equals(request.getEmail()))) {
            throw new UserAlreadyExist();
        }

        if (request.getName() == null) {
            request.setName(user.getName());
        }
        if (request.getEmail() == null) {
            request.setEmail(user.getEmail());
        }

        userMapper.update(request, user);
        userRepository.save(user);
        return user;
    }

    public void deleteUser(Long id) {
        var userId = getUserId();

        isIdIdentical(id, userId);

        var user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            throw new UserNotFoundException();
        }

        userRepository.delete(user);
    }

    private static Long getUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        return (Long) authentication.getPrincipal();
    }

    private void isUserExistInDatabase(String email) {
        if (userRepository.existsUserByEmail(email)) {
            throw new UserAlreadyExist();
        }
    }

    private static void isIdIdentical(Long id, Long userId) {
        if (!id.equals(userId)) {
            throw new UserNotFoundException();
        }
    }
}
