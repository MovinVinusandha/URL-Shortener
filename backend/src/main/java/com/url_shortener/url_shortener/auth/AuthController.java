package com.url_shortener.url_shortener.auth;

import com.url_shortener.url_shortener.common.EmailService;
import com.url_shortener.url_shortener.common.RateLimiterService;
import com.url_shortener.url_shortener.users.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final JwtConfig jwtConfig;
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final UserService userService;
    private final EmailService emailService;
    private final RateLimiterService rateLimiterService;
    private final OAuthService oauthService;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final TokenRevocationService tokenRevocationService;

    @Value("${app.dashboard.url:http://localhost:5173}")
    private String dashboardUrl;

    public AuthController(AuthenticationManager authenticationManager,
                          JwtService jwtService,
                          JwtConfig jwtConfig,
                          UserRepository userRepository,
                          UserMapper userMapper,
                          UserService userService,
                          EmailService emailService,
                          RateLimiterService rateLimiterService,
                          OAuthService oauthService,
                          PasswordEncoder passwordEncoder,
                          PasswordResetTokenRepository passwordResetTokenRepository,
                          EmailVerificationTokenRepository emailVerificationTokenRepository,
                          TokenRevocationService tokenRevocationService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.jwtConfig = jwtConfig;
        this.userRepository = userRepository;
        this.userMapper = userMapper;
        this.userService = userService;
        this.emailService = emailService;
        this.rateLimiterService = rateLimiterService;
        this.oauthService = oauthService;
        this.passwordEncoder = passwordEncoder;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.emailVerificationTokenRepository = emailVerificationTokenRepository;
        this.tokenRevocationService = tokenRevocationService;
    }

    @GetMapping("/check-username")
    public ResponseEntity<Map<String, Object>> checkUsername(@RequestParam(value = "username", required = false) String username) {
        if (username == null || username.trim().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "available", false,
                    "message", "Username parameter is required"
            ));
        }

        String trimmed = username.trim();
        if (!trimmed.matches("^[a-zA-Z0-9_]{3,30}$")) {
            return ResponseEntity.ok(Map.of(
                    "available", false,
                    "message", "Username must be 3-30 characters containing only letters, numbers, and underscores."
            ));
        }

        boolean exists = userRepository.existsByUsername(trimmed.toLowerCase());
        if (exists) {
            return ResponseEntity.ok(Map.of(
                    "available", false,
                    "message", "Username '" + trimmed + "' is already taken."
            ));
        }

        return ResponseEntity.ok(Map.of(
                "available", true,
                "message", "Username is available."
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest loginRequest,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String clientIp = extractClientIp(request);
        if (!rateLimiterService.checkLoginAttempts(clientIp, loginRequest.getIdentifier())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Too many login attempts. Please try again in a few minutes."));
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getIdentifier(),
                            loginRequest.getPassword()
                    )
            );
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", e.getMessage() != null && !e.getMessage().equals("Bad credentials") 
                            ? e.getMessage() : "Invalid email/username or password."));
        }

        rateLimiterService.resetLoginAttempts(clientIp, loginRequest.getIdentifier());

        var user = userRepository.findByEmailIgnoreCaseOrUsernameIgnoreCase(
                loginRequest.getIdentifier(), loginRequest.getIdentifier()
        ).orElseThrow();

        if (!user.isEmailVerified()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "error", "EMAIL_NOT_VERIFIED",
                            "message", "Your email address is not verified yet. Please check your inbox or request a new verification link.",
                            "email", user.getEmail()
                    ));
        }

        var accessToken = jwtService.generateAccessToken(user);
        var refreshToken = jwtService.generateRefreshToken(user);

        setRefreshTokenCookie(response, refreshToken.toString());

        return ResponseEntity.ok(new JwtResponse(accessToken.toString()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletResponse response
    ) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            var jwt = jwtService.parseToken(token);
            if (jwt != null) {
                tokenRevocationService.revokeToken(token, jwt.getExpiration());
            }
        }
        clearRefreshTokenCookie(response);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/refresh")
    public ResponseEntity<JwtResponse> refreshToken(@CookieValue(value = "refreshToken", required = false) String refreshToken) {
        if (refreshToken == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        var jwt = jwtService.parseToken(refreshToken);
        if (jwt == null || jwt.isExpired()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Check if user has been globally revoked
        if (tokenRevocationService.isIssuedBeforeRevocation(jwt.getUserId(), jwt.getIssuedAt())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        var user = userRepository.findById(jwt.getUserId()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        var accessToken = jwtService.generateAccessToken(user);

        return ResponseEntity.ok(new JwtResponse(accessToken.toString()));
    }

    @PostMapping("/forgot-password")
    @Transactional
    public ResponseEntity<?> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest httpRequest
    ) {
        String clientIp = extractClientIp(httpRequest);
        if (!rateLimiterService.checkForgotPassword(clientIp, request.getEmail())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Too many password reset requests. Please try again in a few minutes."));
        }

        Optional<User> userOpt = userRepository.findByEmail(request.getEmail().trim().toLowerCase());
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            passwordResetTokenRepository.deleteByUser(user);

            String rawToken = AuthTokenUtil.generateRandomToken();
            String tokenHash = AuthTokenUtil.hashToken(rawToken);

            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .user(user)
                    .tokenHash(tokenHash)
                    .expiresAt(LocalDateTime.now().plusMinutes(30))
                    .build();
            passwordResetTokenRepository.save(resetToken);

            emailService.sendPasswordResetEmail(user, rawToken);
        }

        // Generic response prevents email enumeration
        return ResponseEntity.ok(Map.of("message", "If an account with that email exists, a password reset link has been sent."));
    }

    @PostMapping("/reset-password")
    @Transactional
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        String tokenHash = AuthTokenUtil.hashToken(request.getToken().trim());
        var tokenOpt = passwordResetTokenRepository.findByTokenHash(tokenHash);

        if (tokenOpt.isEmpty() || !tokenOpt.get().isValid()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid or expired password reset link."));
        }

        PasswordResetToken token = tokenOpt.get();
        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        token.setUsedAt(LocalDateTime.now());
        passwordResetTokenRepository.save(token);

        // Globally revoke all previous sessions/tokens for this user
        tokenRevocationService.revokeAllUserTokens(user.getId());

        return ResponseEntity.ok(Map.of("message", "Password has been successfully updated. You can now log in."));
    }

    @PostMapping("/verify-email")
    @Transactional
    public ResponseEntity<?> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        String tokenHash = AuthTokenUtil.hashToken(request.getToken().trim());
        var tokenOpt = emailVerificationTokenRepository.findByTokenHash(tokenHash);

        if (tokenOpt.isEmpty() || !tokenOpt.get().isValid()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid or expired email verification link."));
        }

        EmailVerificationToken token = tokenOpt.get();
        User user = token.getUser();
        user.setEmailVerified(true);
        user.setEmailVerifiedAt(LocalDateTime.now());
        userRepository.save(user);

        token.setUsedAt(LocalDateTime.now());
        emailVerificationTokenRepository.save(token);

        return ResponseEntity.ok(Map.of("message", "Email verified successfully! You have full access to your account."));
    }

    @PostMapping("/resend-verification")
    @Transactional
    public ResponseEntity<?> resendVerification(
            @Valid @RequestBody ResendVerificationRequest request
    ) {
        if (!rateLimiterService.checkResendVerification(request.getEmail())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Please wait before requesting another verification email."));
        }

        Optional<User> userOpt = userRepository.findByEmail(request.getEmail().trim().toLowerCase());
        if (userOpt.isPresent() && !userOpt.get().isEmailVerified()) {
            userService.sendNewVerificationEmail(userOpt.get());
        }

        return ResponseEntity.ok(Map.of("message", "If an unverified account with that email exists, a new verification link has been sent."));
    }

    @GetMapping("/oauth/providers")
    public ResponseEntity<Map<String, Boolean>> getAvailableOAuthProviders() {
        return ResponseEntity.ok(Map.of(
                "google", oauthService.isProviderConfigured("google"),
                "github", oauthService.isProviderConfigured("github")
        ));
    }

    @GetMapping("/oauth/{provider}")
    public ResponseEntity<Void> redirectToProvider(@PathVariable("provider") String provider) {
        String authUrl = oauthService.generateAuthorizationUrl(provider);
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(authUrl)).build();
    }

    @GetMapping("/oauth/{provider}/callback")
    public ResponseEntity<Void> oauthCallback(
            @PathVariable("provider") String provider,
            @RequestParam("code") String code,
            @RequestParam("state") String state,
            HttpServletResponse response
    ) {
        try {
            User user = oauthService.processCallback(provider, code, state);
            var accessToken = jwtService.generateAccessToken(user);
            var refreshToken = jwtService.generateRefreshToken(user);

            setRefreshTokenCookie(response, refreshToken.toString());

            String redirectUrl = dashboardUrl.replaceAll("/$", "") + "/oauth/callback?token=" + accessToken.toString();
            return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(redirectUrl)).build();
        } catch (Exception e) {
            String redirectUrl = dashboardUrl.replaceAll("/$", "") + "/login?oauth_error=" +
                    java.net.URLEncoder.encode(e.getMessage() != null ? e.getMessage() : "OAuth authentication failed", java.nio.charset.StandardCharsets.UTF_8);
            return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(redirectUrl)).build();
        }
    }

    @GetMapping("/me")
    @Transactional(readOnly = true)
    public ResponseEntity<UserDto> me() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Long)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        var userId = (Long) authentication.getPrincipal();

        var user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        var userDto = userMapper.toDto(user);
        return ResponseEntity.ok(userDto);
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken)
                .httpOnly(true)
                .path("/auth")
                .maxAge(jwtConfig.getRefreshTokenExpiration())
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .path("/auth")
                .maxAge(0)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private String extractClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
