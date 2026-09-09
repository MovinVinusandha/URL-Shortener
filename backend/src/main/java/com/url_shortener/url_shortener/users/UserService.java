package com.url_shortener.url_shortener.users;

import com.url_shortener.url_shortener.analytics.ClickEventRepository;
import com.url_shortener.url_shortener.auth.AuthTokenUtil;
import com.url_shortener.url_shortener.auth.EmailVerificationToken;
import com.url_shortener.url_shortener.auth.EmailVerificationTokenRepository;
import com.url_shortener.url_shortener.auth.OAuthService;
import com.url_shortener.url_shortener.common.EmailService;
import com.url_shortener.url_shortener.urls.Folder;
import com.url_shortener.url_shortener.urls.FolderRepository;
import com.url_shortener.url_shortener.urls.TagRepository;
import com.url_shortener.url_shortener.urls.UrlRepository;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.url_shortener.url_shortener.auth.PasswordResetToken;
import com.url_shortener.url_shortener.auth.PasswordResetTokenRepository;
import com.url_shortener.url_shortener.common.EmailDomainValidator;
import com.url_shortener.url_shortener.urls.CustomChannelRepository;
import com.url_shortener.url_shortener.urls.UtmTemplateRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@AllArgsConstructor
public class UserService {
    private final UserMapper userMapper;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ClickEventRepository clickEventRepository;
    private final UrlRepository urlRepository;
    private final TagRepository tagRepository;
    private final FolderRepository folderRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final UtmTemplateRepository utmTemplateRepository;
    private final CustomChannelRepository customChannelRepository;
    private final EmailService emailService;
    private final OAuthService oauthService;
    private final EmailDomainValidator emailDomainValidator;
    private final com.url_shortener.url_shortener.auth.TokenRevocationService tokenRevocationService;

    @Transactional
    public UserDto registerUser(UserRegister userRegister) {
        String email = userRegister.getEmail().trim().toLowerCase();
        emailDomainValidator.validateEmailDomain(email);
        if (userRepository.existsByEmail(email)) {
            throw new UserAlreadyExist();
        }

        String username = resolveUsername(userRegister);
        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Username '" + username + "' is already taken");
        }

        var user = userMapper.toEntity(userRegister);
        user.setEmail(email);
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(userRegister.getPassword()));
        user.setRole(Role.USER);
        user.setEmailVerified(false);
        user.setEmailVerifiedAt(null);
        userRepository.save(user);

        // Auto-create default "Links" folder for the user
        Folder defaultFolder = Folder.builder()
                .name("Links")
                .slug("links")
                .user(user)
                .build();
        folderRepository.save(defaultFolder);

        // Generate email verification token and send email
        sendNewVerificationEmail(user);

        return userMapper.toDto(user);
    }

    private String resolveUsername(UserRegister userRegister) {
        if (userRegister.getUsername() != null && !userRegister.getUsername().isBlank()) {
            return userRegister.getUsername().trim().toLowerCase();
        }
        // Derive username from email or name
        String base = userRegister.getEmail().split("@")[0].replaceAll("[^a-zA-Z0-9_]", "").toLowerCase();
        if (base.length() < 3) {
            base = "user" + base;
        }
        if (base.length() > 25) {
            base = base.substring(0, 25);
        }

        String candidate = base;
        int counter = 1;
        while (userRepository.existsByUsername(candidate)) {
            candidate = base + counter;
            counter++;
        }
        return candidate;
    }

    public void sendNewVerificationEmail(User user) {
        emailVerificationTokenRepository.deleteByUser(user);

        String rawToken = AuthTokenUtil.generateRandomToken();
        String tokenHash = AuthTokenUtil.hashToken(rawToken);

        EmailVerificationToken verificationToken = EmailVerificationToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .expiresAt(LocalDateTime.now().plusHours(24))
                .build();
        emailVerificationTokenRepository.save(verificationToken);

        emailService.sendVerificationEmail(user, rawToken);
    }

    public List<UserDto> getAllUsers(String sortBy) {
        if (!Set.of("username", "email", "id").contains(sortBy))
            sortBy = "id";

        return userRepository.findAll(Sort.by(sortBy))
                .stream()
                .map(userMapper::toDto)
                .toList();
    }

    public User updateUser(String publicId, UpdateUserRequest request) {
        var userId = getUserId();

        var user = userRepository.findByPublicId(publicId).orElseThrow(UserNotFoundException::new);
        
        isIdIdentical(user.getId(), userId);

        if (request.getEmail() != null && !user.getEmail().equalsIgnoreCase(request.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new UserAlreadyExist();
            }
        }

        if (request.getUsername() != null && !request.getUsername().equalsIgnoreCase(user.getUsername())) {
            if (userRepository.existsByUsername(request.getUsername())) {
                throw new IllegalArgumentException("Username is already taken");
            }
            user.setUsername(request.getUsername().toLowerCase());
        }

        if (request.getEmail() == null) {
            request.setEmail(user.getEmail());
        }

        userMapper.update(request, user);
        userRepository.save(user);
        return user;
    }

    public void deleteUser(String publicId) {
        var userId = getUserId();

        var user = userRepository.findByPublicId(publicId).orElseThrow(UserNotFoundException::new);
        
        isIdIdentical(user.getId(), userId);

        userRepository.delete(user);
    }

    @Transactional
    public User updateMe(UserUpdateRequestDto request) {
        var userId = getUserId();
        var user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);

        if (request.getEmail() != null && !user.getEmail().equalsIgnoreCase(request.getEmail().trim())) {
            String cleanEmail = request.getEmail().trim().toLowerCase();
            emailDomainValidator.validateEmailDomain(cleanEmail);
            if (userRepository.existsByEmail(cleanEmail)) {
                throw new UserAlreadyExist();
            }
            user.setEmail(cleanEmail);
            user.setEmailVerified(false);
            user.setEmailVerifiedAt(null);
            sendNewVerificationEmail(user);
        }

        if (request.getUsername() != null && !request.getUsername().isBlank()
                && !request.getUsername().equalsIgnoreCase(user.getUsername())) {
            String newUsername = request.getUsername().trim().toLowerCase();
            if (userRepository.existsByUsername(newUsername)) {
                throw new IllegalArgumentException("Username is already taken");
            }
            user.setUsername(newUsername);
        }

        userRepository.save(user);
        return user;
    }

    public void changePassword(PasswordChangeRequestDto request) {
        var userId = getUserId();
        var user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);

        if (user.getPassword() == null) {
            throw new IllegalArgumentException("No existing password found. Please use the set-password option.");
        }

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Incorrect current password");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Globally revoke all previous sessions/tokens for this user
        tokenRevocationService.revokeAllUserTokens(userId);

        // Send security alert notice
        emailService.sendPasswordChangedAlert(user);
    }

    @Transactional
    public void requestInitialPasswordSetup() {
        var userId = getUserId();
        var user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);

        if (user.hasPassword()) {
            throw new IllegalArgumentException("Your account already has a password set. You can change your password using your current password.");
        }

        passwordResetTokenRepository.deleteByUser(user);

        String rawToken = AuthTokenUtil.generateRandomToken();
        String tokenHash = AuthTokenUtil.hashToken(rawToken);

        PasswordResetToken token = PasswordResetToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .expiresAt(LocalDateTime.now().plusMinutes(30))
                .build();
        passwordResetTokenRepository.save(token);

        emailService.sendSetInitialPasswordEmail(user, rawToken);
    }

    public void setInitialPassword(PasswordSetRequestDto request) {
        var userId = getUserId();
        var user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);

        if (user.hasPassword()) {
            throw new IllegalArgumentException("Account already has a password set. Please use change password.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    public List<OAuthAccountDto> getConnectedOAuthAccounts() {
        var userId = getUserId();
        var user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);

        return user.getOauthAccounts().stream()
                .map(acc -> OAuthAccountDto.builder()
                        .provider(acc.getProvider())
                        .providerEmail(acc.getProviderEmail())
                        .connectedAt(acc.getCreatedAt())
                        .build())
                .toList();
    }

    @Transactional
    public void unlinkOAuthAccount(String provider) {
        var userId = getUserId();
        var user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);
        oauthService.unlinkProvider(user, provider);
    }

    @Transactional
    public void deleteMe() {
        var userId = getUserId();
        var user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);

        // 1. Delete all tokens
        emailVerificationTokenRepository.deleteByUser(user);
        passwordResetTokenRepository.deleteByUser(user);

        // 2. Delete all UTM templates and Custom Channels
        utmTemplateRepository.deleteAll(utmTemplateRepository.findByUserOrderByCreatedAtDesc(user));
        customChannelRepository.deleteAll(customChannelRepository.findAllByUserIdOrderByIdAsc(userId));

        // 3. Delete all Click Events for the user's URLs
        clickEventRepository.deleteByUserId(userId);

        // 4. Delete all tags and tag associations
        var tags = tagRepository.findByUser(user);
        for (var tag : tags) {
            tagRepository.deleteTagAssociations(tag.getId());
        }
        tagRepository.deleteAll(tags);

        // 5. Delete all URLs (cascades statistics)
        var urls = urlRepository.findByUserId(userId);
        for (var url : urls) {
            url.getTags().clear();
        }
        urlRepository.saveAll(urls);
        urlRepository.deleteAll(urls);

        // 6. Delete all folders
        folderRepository.deleteAll(folderRepository.findByUserId(userId));

        // 7. Globally revoke tokens
        tokenRevocationService.revokeAllUserTokens(userId);

        // 8. Delete user (cascades oauth accounts)
        userRepository.delete(user);
    }

    private static Long getUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        return (Long) authentication.getPrincipal();
    }

    private static void isIdIdentical(Long id, Long userId) {
        if (!id.equals(userId)) {
            throw new UserNotFoundException();
        }
    }
}
