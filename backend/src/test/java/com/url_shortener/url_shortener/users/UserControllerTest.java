package com.url_shortener.url_shortener.users;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserMapper userMapper;

    @Mock
    private UserService userService;

    @Mock
    private com.url_shortener.url_shortener.common.RateLimiterService rateLimiterService;

    @Mock
    private jakarta.servlet.http.HttpServletRequest httpServletRequest;

    private UserController userController;

    @BeforeEach
    void setUp() {
        userController = new UserController(userMapper, userService, rateLimiterService);
    }

    @Test
    void registerUser_Success() {
        UserRegister register = new UserRegister("Test", "test@user.com", "Password123!");
        UserDto dto = new UserDto("public-id", "Test", "test@user.com", "USER", LocalDateTime.now());

        when(httpServletRequest.getRemoteAddr()).thenReturn("127.0.0.1");
        when(rateLimiterService.checkRegistration("127.0.0.1")).thenReturn(true);
        when(userService.registerUser(register)).thenReturn(dto);

        ResponseEntity<?> response = userController.registerUser(register, httpServletRequest);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(dto);
    }

    @Test
    void getAllUsers_Success() {
        UserDto dto = new UserDto("public-id", "Test", "test@user.com", "USER", LocalDateTime.now());
        when(userService.getAllUsers("email")).thenReturn(List.of(dto));

        Iterable<UserDto> response = userController.getAllUsers("email");

        assertThat(response).containsExactly(dto);
    }

    @Test
    void updateUser_Success() {
        UpdateUserRequest updateRequest = new UpdateUserRequest("Updated Name", "updated@email.com");
        User user = new User();
        UserDto dto = new UserDto("public-id", "Updated Name", "updated@email.com", "USER", LocalDateTime.now());

        when(userService.updateUser("public-id", updateRequest)).thenReturn(user);
        when(userMapper.toDto(user)).thenReturn(dto);

        ResponseEntity<UserDto> response = userController.updateUser("public-id", updateRequest);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(dto);
    }

    @Test
    void deleteUser_Success() {
        ResponseEntity<Void> response = userController.deleteUser("public-id");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(userService).deleteUser("public-id");
    }
}
