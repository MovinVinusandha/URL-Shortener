package com.url_shortener.url_shortener.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.url_shortener.url_shortener.common.EmailService;
import com.url_shortener.url_shortener.common.RateLimiterService;
import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserDto;
import com.url_shortener.url_shortener.users.UserMapper;
import com.url_shortener.url_shortener.users.UserRepository;
import com.url_shortener.url_shortener.users.UserService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
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
    @MockBean
    private UserService userService;
    @MockBean
    private EmailService emailService;
    @MockBean
    private RateLimiterService rateLimiterService;
    @MockBean
    private OAuthService oauthService;
    @MockBean
    private PasswordEncoder passwordEncoder;
    @MockBean
    private PasswordResetTokenRepository passwordResetTokenRepository;
    @MockBean
    private EmailVerificationTokenRepository emailVerificationTokenRepository;

    @BeforeEach
    void setUp() {
        when(rateLimiterService.checkLoginAttempts(any(), any())).thenReturn(true);
        when(rateLimiterService.checkForgotPassword(any(), any())).thenReturn(true);
        when(rateLimiterService.checkResendVerification(any())).thenReturn(true);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void login_Success() throws Exception {
        LoginRequest loginRequest = new LoginRequest("test@test.com", "password123");

        User user = User.builder().id(1L).username("testuser").email("test@test.com").emailVerified(true).build();

        when(authenticationManager.authenticate(any(Authentication.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken("test@test.com", "password123"));
        when(userRepository.findByEmailIgnoreCaseOrUsernameIgnoreCase("test@test.com", "test@test.com"))
                .thenReturn(Optional.of(user));

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
                .andExpect(cookie().httpOnly("refreshToken", true))
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("SameSite=Lax")));
    }

    @Test
    void login_UnverifiedEmail_ReturnsForbidden() throws Exception {
        LoginRequest loginRequest = new LoginRequest("unverified@test.com", "password123");

        User user = User.builder().id(2L).username("unverified").email("unverified@test.com").emailVerified(false).build();

        when(authenticationManager.authenticate(any(Authentication.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken("unverified@test.com", "password123"));
        when(userRepository.findByEmailIgnoreCaseOrUsernameIgnoreCase("unverified@test.com", "unverified@test.com"))
                .thenReturn(Optional.of(user));

        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("EMAIL_NOT_VERIFIED"))
                .andExpect(jsonPath("$.email").value("unverified@test.com"));
    }

    @Test
    void login_WithUsername_Success() throws Exception {
        LoginRequest loginRequest = new LoginRequest("testuser", "password123");

        User user = User.builder().id(1L).username("testuser").email("test@test.com").emailVerified(true).build();

        when(authenticationManager.authenticate(any(Authentication.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken("testuser", "password123"));
        when(userRepository.findByEmailIgnoreCaseOrUsernameIgnoreCase("testuser", "testuser"))
                .thenReturn(Optional.of(user));

        Jwt mockAccessJwt = mock(Jwt.class);
        when(mockAccessJwt.toString()).thenReturn("access_token_456");
        when(jwtService.generateAccessToken(user)).thenReturn(mockAccessJwt);

        Jwt mockRefreshJwt = mock(Jwt.class);
        when(mockRefreshJwt.toString()).thenReturn("refresh_token_456");
        when(jwtService.generateRefreshToken(user)).thenReturn(mockRefreshJwt);

        when(jwtConfig.getRefreshTokenExpiration()).thenReturn(86400);

        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("access_token_456"));
    }

    @Test
    void checkUsername_Available_ReturnsTrue() throws Exception {
        when(userRepository.existsByUsername("newuser")).thenReturn(false);

        mockMvc.perform(get("/auth/check-username").param("username", "newuser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true));
    }

    @Test
    void checkUsername_Taken_ReturnsFalse() throws Exception {
        when(userRepository.existsByUsername("existinguser")).thenReturn(true);

        mockMvc.perform(get("/auth/check-username").param("username", "existinguser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(false))
                .andExpect(jsonPath("$.message").value("Username 'existinguser' is already taken."));
    }

    @Test
    void checkUsername_InvalidFormat_ReturnsFalse() throws Exception {
        mockMvc.perform(get("/auth/check-username").param("username", "ab"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(false));
    }

    @Test
    void logout_Success_ClearsCookie() throws Exception {
        mockMvc.perform(post("/auth/logout"))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("refreshToken"))
                .andExpect(cookie().maxAge("refreshToken", 0));
    }

    @Test
    void login_BadCredentials_Returns401() throws Exception {
        LoginRequest loginRequest = new LoginRequest("test@test.com", "wrongpass");

        when(authenticationManager.authenticate(any(Authentication.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized());
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
    void refreshToken_Unauthorized_WhenNull() throws Exception {
        when(jwtService.parseToken("invalid_token")).thenReturn(null);

        mockMvc.perform(post("/auth/refresh")
                .cookie(new Cookie("refreshToken", "invalid_token")))
                .andExpect(status().isUnauthorized());
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

    @Test
    void forgotPassword_Success() throws Exception {
        ForgotPasswordRequest request = new ForgotPasswordRequest("user@example.com");
        User user = User.builder().id(1L).email("user@example.com").username("testuser").build();

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));

        mockMvc.perform(post("/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("password reset link")));

        verify(emailService, times(1)).sendPasswordResetEmail(eq(user), anyString());
    }

    @Test
    void resetPassword_Success() throws Exception {
        ResetPasswordRequest request = new ResetPasswordRequest("valid_token", "newPassword123");
        User user = User.builder().id(1L).email("user@example.com").build();

        PasswordResetToken token = PasswordResetToken.builder()
                .id(1L)
                .user(user)
                .tokenHash(AuthTokenUtil.hashToken("valid_token"))
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build();

        when(passwordResetTokenRepository.findByTokenHash(AuthTokenUtil.hashToken("valid_token")))
                .thenReturn(Optional.of(token));
        when(passwordEncoder.encode("newPassword123")).thenReturn("encodedPassword");

        mockMvc.perform(post("/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Password has been successfully updated")));

        verify(userRepository, times(1)).save(user);
    }

    @Test
    void resetPassword_InvalidToken_Returns400() throws Exception {
        ResetPasswordRequest request = new ResetPasswordRequest("bad_token", "newPassword123");

        when(passwordResetTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        mockMvc.perform(post("/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void verifyEmail_Success() throws Exception {
        VerifyEmailRequest request = new VerifyEmailRequest("verify_123");
        User user = User.builder().id(1L).email("user@example.com").emailVerified(false).build();

        EmailVerificationToken token = EmailVerificationToken.builder()
                .id(1L)
                .user(user)
                .tokenHash(AuthTokenUtil.hashToken("verify_123"))
                .expiresAt(LocalDateTime.now().plusHours(24))
                .build();

        when(emailVerificationTokenRepository.findByTokenHash(AuthTokenUtil.hashToken("verify_123")))
                .thenReturn(Optional.of(token));

        mockMvc.perform(post("/auth/verify-email")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Email verified successfully")));

        verify(userRepository, times(1)).save(user);
    }

    @Test
    void verifyEmail_ExpiredToken_Returns400() throws Exception {
        VerifyEmailRequest request = new VerifyEmailRequest("expired_123");
        User user = User.builder().id(1L).email("user@example.com").build();

        EmailVerificationToken token = EmailVerificationToken.builder()
                .id(1L)
                .user(user)
                .tokenHash(AuthTokenUtil.hashToken("expired_123"))
                .expiresAt(LocalDateTime.now().minusHours(1)) // expired
                .build();

        when(emailVerificationTokenRepository.findByTokenHash(AuthTokenUtil.hashToken("expired_123")))
                .thenReturn(Optional.of(token));

        mockMvc.perform(post("/auth/verify-email")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void resendVerification_Success() throws Exception {
        ResendVerificationRequest request = new ResendVerificationRequest("user@example.com");
        User user = User.builder().id(1L).email("user@example.com").emailVerified(false).build();

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));

        mockMvc.perform(post("/auth/resend-verification")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(userService, times(1)).sendNewVerificationEmail(user);
    }

    @Test
    void getOAuthProviders_Success() throws Exception {
        when(oauthService.isProviderConfigured("google")).thenReturn(true);
        when(oauthService.isProviderConfigured("github")).thenReturn(false);

        mockMvc.perform(get("/auth/oauth/providers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.google").value(true))
                .andExpect(jsonPath("$.github").value(false));
    }

    @Test
    void me_Success() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(1L, null, Collections.emptyList())
        );

        User user = User.builder().id(1L).username("testuser").email("test@test.com").build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        UserDto userDto = new UserDto("uuid-123", "testuser", "test@test.com", "USER", LocalDateTime.now());
        when(userMapper.toDto(user)).thenReturn(userDto);

        mockMvc.perform(get("/auth/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.email").value("test@test.com"));
    }

    @Test
    void me_UserNotFound_Returns404() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(999L, null, Collections.emptyList())
        );

        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/auth/me"))
                .andExpect(status().isNotFound());
    }
}
