package com.url_shortener.url_shortener.users;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

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
        UserUpdateRequestDto request = new UserUpdateRequestDto("alice", "alice@example.com");
        User user = User.builder().id(1L).username("alice").email("alice@example.com").build();
        UserDto dto = new UserDto("public_id_123", "alice", "alice@example.com", "USER", null);

        when(userService.updateMe(any(UserUpdateRequestDto.class))).thenReturn(user);
        when(userMapper.toDto(user)).thenReturn(dto);

        mockMvc.perform(put("/users/me")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"));
    }

    @Test
    void changePassword_Success() throws Exception {
        PasswordChangeRequestDto request = new PasswordChangeRequestDto("oldPassword", "NewPassword123!");

        mockMvc.perform(put("/users/me/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(userService).changePassword(any(PasswordChangeRequestDto.class));
    }

    @Test
    void setInitialPassword_Success() throws Exception {
        PasswordSetRequestDto request = new PasswordSetRequestDto("NewPassword123!");

        mockMvc.perform(post("/users/me/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(userService).setInitialPassword(any(PasswordSetRequestDto.class));
    }

    @Test
    void requestInitialPasswordSetup_Success() throws Exception {
        mockMvc.perform(post("/users/me/password/request-setup"))
                .andExpect(status().isNoContent());

        verify(userService).requestInitialPasswordSetup();
    }

    @Test
    void getOAuthAccounts_Success() throws Exception {
        OAuthAccountDto dto = OAuthAccountDto.builder()
                .provider("GOOGLE")
                .providerEmail("user@gmail.com")
                .connectedAt(LocalDateTime.now())
                .build();

        when(userService.getConnectedOAuthAccounts()).thenReturn(List.of(dto));

        mockMvc.perform(get("/users/me/oauth-accounts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].provider").value("GOOGLE"))
                .andExpect(jsonPath("$[0].providerEmail").value("user@gmail.com"));
    }

    @Test
    void unlinkOAuthAccount_Success() throws Exception {
        mockMvc.perform(delete("/users/me/oauth-accounts/GOOGLE"))
                .andExpect(status().isNoContent());

        verify(userService).unlinkOAuthAccount("GOOGLE");
    }

    @Test
    void deleteMe_Success() throws Exception {
        mockMvc.perform(delete("/users/me"))
                .andExpect(status().isNoContent());

        verify(userService).deleteMe();
    }
}
