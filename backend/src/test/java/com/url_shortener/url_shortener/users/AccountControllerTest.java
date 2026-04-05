package com.url_shortener.url_shortener.users;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AccountController.class)
@AutoConfigureMockMvc(addFilters = false)
class AccountControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserService userService;

    @MockBean
    private UserMapper userMapper;
    @MockBean
    private com.url_shortener.url_shortener.auth.JwtService jwtService;

    @Test
    void updateMe_Success() throws Exception {
        UserUpdateRequestDto request = new UserUpdateRequestDto("Alice", "alice@example.com");
        User user = User.builder().id(1L).name("Alice").email("alice@example.com").build();
        UserDto dto = new UserDto("public_id_123", "Alice", "alice@example.com", "USER", null);

        when(userService.updateMe(any(UserUpdateRequestDto.class))).thenReturn(user);
        when(userMapper.toDto(user)).thenReturn(dto);

        mockMvc.perform(put("/api/users/me")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Alice"));
    }

    @Test
    void changePassword_Success() throws Exception {
        PasswordChangeRequestDto request = new PasswordChangeRequestDto("oldPassword", "NewPassword123!");

        mockMvc.perform(put("/api/users/me/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(userService).changePassword(any(PasswordChangeRequestDto.class));
    }

    @Test
    void deleteMe_Success() throws Exception {
        mockMvc.perform(delete("/api/users/me"))
                .andExpect(status().isNoContent());

        verify(userService).deleteMe();
    }
}
