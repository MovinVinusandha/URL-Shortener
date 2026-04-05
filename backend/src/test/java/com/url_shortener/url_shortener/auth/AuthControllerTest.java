package com.url_shortener.url_shortener.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserRepository;
import com.url_shortener.url_shortener.users.UserMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import jakarta.servlet.http.Cookie;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false) // Disable security filters for isolated unit test
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthenticationManager authenticationManager;
    @MockBean
    private JwtService jwtService;
    @MockBean
    private JwtConfig jwtConfig;
    @MockBean
    private UserRepository userRepository;
    @MockBean
    private UserMapper userMapper;

    @Test
    void login_Success() throws Exception {
        LoginRequest loginRequest = new LoginRequest("test@test.com", "password123");

        User user = User.builder().id(1L).email("test@test.com").build();
        
        when(authenticationManager.authenticate(any(Authentication.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken("test@test.com", "password123"));
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(user));
        
        Jwt mockAccessJwt = mock(Jwt.class);
        when(mockAccessJwt.toString()).thenReturn("access_token_123");
        when(jwtService.generateAccessToken(user)).thenReturn(mockAccessJwt);
        
        Jwt mockRefreshJwt = mock(Jwt.class);
        when(mockRefreshJwt.toString()).thenReturn("refresh_token_123");
        when(jwtService.generateRefreshToken(user)).thenReturn(mockRefreshJwt);
        
        when(jwtConfig.getRefreshTokenExpiration()).thenReturn(86400);

        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("access_token_123"))
                .andExpect(cookie().exists("refreshToken"))
                .andExpect(cookie().httpOnly("refreshToken", true));
    }

    @Test
    void refreshToken_Success() throws Exception {
        Jwt mockJwt = mock(Jwt.class);
        when(jwtService.parseToken("refresh_token_123")).thenReturn(mockJwt);
        when(mockJwt.isExpired()).thenReturn(false);
        when(mockJwt.getUserId()).thenReturn(1L);

        User user = User.builder().id(1L).email("test@test.com").build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        Jwt mockAccessJwt = mock(Jwt.class);
        when(mockAccessJwt.toString()).thenReturn("new_access_token");
        when(jwtService.generateAccessToken(user)).thenReturn(mockAccessJwt);

        mockMvc.perform(post("/auth/refresh")
                .cookie(new Cookie("refreshToken", "refresh_token_123")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("new_access_token"));
    }

    @Test
    void refreshToken_Unauthorized_WhenExpired() throws Exception {
        Jwt mockJwt = mock(Jwt.class);
        when(jwtService.parseToken("refresh_token_123")).thenReturn(mockJwt);
        when(mockJwt.isExpired()).thenReturn(true);

        mockMvc.perform(post("/auth/refresh")
                .cookie(new Cookie("refreshToken", "refresh_token_123")))
                .andExpect(status().isUnauthorized());
    }
}
