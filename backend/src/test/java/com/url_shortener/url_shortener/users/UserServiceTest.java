package com.url_shortener.url_shortener.users;

import com.url_shortener.url_shortener.analytics.ClickEventRepository;
import com.url_shortener.url_shortener.auth.EmailVerificationToken;
import com.url_shortener.url_shortener.auth.EmailVerificationTokenRepository;
import com.url_shortener.url_shortener.auth.OAuthService;
import com.url_shortener.url_shortener.common.EmailService;
import com.url_shortener.url_shortener.urls.Folder;
import com.url_shortener.url_shortener.urls.FolderRepository;
import com.url_shortener.url_shortener.urls.Tag;
import com.url_shortener.url_shortener.urls.TagRepository;
import com.url_shortener.url_shortener.urls.UrlRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserMapper userMapper;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private ClickEventRepository clickEventRepository;
    @Mock
    private UrlRepository urlRepository;
    @Mock
    private TagRepository tagRepository;
    @Mock
    private FolderRepository folderRepository;
    @Mock
    private EmailVerificationTokenRepository emailVerificationTokenRepository;
    @Mock
    private com.url_shortener.url_shortener.auth.PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock
    private com.url_shortener.url_shortener.urls.UtmTemplateRepository utmTemplateRepository;
    @Mock
    private com.url_shortener.url_shortener.urls.CustomChannelRepository customChannelRepository;
    @Mock
    private EmailService emailService;
    @Mock
    private OAuthService oauthService;
    @Mock
    private com.url_shortener.url_shortener.common.EmailDomainValidator emailDomainValidator;
    @Mock
    private com.url_shortener.url_shortener.auth.TokenRevocationService tokenRevocationService;

    @InjectMocks
    private UserService userService;

    private User user;
    private final Long USER_ID = 1L;

    @BeforeEach
    void setUp() {
        user = User.builder().id(USER_ID).username("john").email("john@example.com").password("encoded").role(Role.USER).publicId("user_1234567890").build();
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(USER_ID, null, Collections.emptyList())
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void registerUser_Success() {
        UserRegister register = new UserRegister("johnny", "new@example.com", "pass123");
        User newUser = new User();
        newUser.setEmail("new@example.com");

        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(userRepository.existsByUsername("johnny")).thenReturn(false);
        when(userMapper.toEntity(register)).thenReturn(newUser);
        when(passwordEncoder.encode("pass123")).thenReturn("encodedPass");
        UserDto dto = UserDto.builder()
                .publicId("user_111")
                .username("johnny")
                .email("new@example.com")
                .role("USER")
                .emailVerified(false)
                .hasPassword(true)
                .connectedOAuthProviders(Collections.emptyList())
                .createdAt(LocalDateTime.now())
                .build();
        when(userMapper.toDto(newUser)).thenReturn(dto);

        UserDto result = userService.registerUser(register);

        assertThat(result).isEqualTo(dto);
        assertThat(newUser.getRole()).isEqualTo(Role.USER);
        assertThat(newUser.getPassword()).isEqualTo("encodedPass");
        assertThat(newUser.getUsername()).isEqualTo("johnny");
        assertThat(newUser.isEmailVerified()).isFalse();
        verify(userRepository).save(newUser);
        verify(folderRepository).save(any(Folder.class));
        verify(emailVerificationTokenRepository).save(any(EmailVerificationToken.class));
        verify(emailService).sendVerificationEmail(eq(newUser), anyString());
    }

    @Test
    void registerUser_AlreadyExistsEmail() {
        UserRegister register = new UserRegister("johnny", "existing@example.com", "pass123");
        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.registerUser(register))
                .isInstanceOf(UserAlreadyExist.class);
    }

    @Test
    void registerUser_AlreadyExistsUsername() {
        UserRegister register = new UserRegister("taken_username", "new@example.com", "pass123");
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(userRepository.existsByUsername("taken_username")).thenReturn(true);

        assertThatThrownBy(() -> userService.registerUser(register))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already taken");
    }

    @Test
    void getAllUsers_Success() {
        when(userRepository.findAll(Sort.by("email"))).thenReturn(List.of(user));
        UserDto dto = new UserDto("user_1234567890", "John", "john@example.com", "USER", LocalDateTime.now());
        when(userMapper.toDto(user)).thenReturn(dto);

        List<UserDto> result = userService.getAllUsers("email");

        assertThat(result).containsExactly(dto);
    }

    @Test
    void getAllUsers_DefaultSortFallback() {
        when(userRepository.findAll(Sort.by("id"))).thenReturn(List.of(user));
        UserDto dto = new UserDto("user_1234567890", "John", "john@example.com", "USER", LocalDateTime.now());
        when(userMapper.toDto(user)).thenReturn(dto);

        List<UserDto> result = userService.getAllUsers("invalid_field");

        assertThat(result).containsExactly(dto);
    }

    @Test
    void updateUser_Success() {
        UpdateUserRequest req = new UpdateUserRequest("New Name", "john@example.com");
        when(userRepository.findByPublicId("user_1234567890")).thenReturn(Optional.of(user));

        User result = userService.updateUser("user_1234567890", req);

        assertThat(result).isEqualTo(user);
        verify(userMapper).update(req, user);
        verify(userRepository).save(user);
    }

    @Test
    void updateUser_UserNotFound_ThrowsException() {
        UpdateUserRequest req = new UpdateUserRequest("Name", "email@test.com");
        when(userRepository.findByPublicId("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.updateUser("missing", req))
                .isInstanceOf(UserNotFoundException.class);
    }

    @Test
    void updateUser_DifferentUserId_ThrowsException() {
        User otherUser = User.builder().id(999L).build();
        UpdateUserRequest req = new UpdateUserRequest("Name", "email@test.com");
        when(userRepository.findByPublicId("other")).thenReturn(Optional.of(otherUser));

        assertThatThrownBy(() -> userService.updateUser("other", req))
                .isInstanceOf(UserNotFoundException.class);
    }

    @Test
    void updateUser_EmailConflict_ThrowsException() {
        UpdateUserRequest req = new UpdateUserRequest("conflict@test.com");
        when(userRepository.findByPublicId("user_1234567890")).thenReturn(Optional.of(user));
        when(userRepository.existsByEmail("conflict@test.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.updateUser("user_1234567890", req))
                .isInstanceOf(UserAlreadyExist.class);
    }

    @Test
    void deleteUser_Success() {
        when(userRepository.findByPublicId("user_1234567890")).thenReturn(Optional.of(user));

        userService.deleteUser("user_1234567890");

        verify(userRepository).delete(user);
    }

    @Test
    void updateMe_Success() {
        UserUpdateRequestDto request = new UserUpdateRequestDto("johndoe", "johndoe@example.com");
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
        when(userRepository.existsByUsername("johndoe")).thenReturn(false);

        User updatedUser = userService.updateMe(request);

        assertThat(updatedUser.getUsername()).isEqualTo("johndoe");
        assertThat(updatedUser.getEmail()).isEqualTo("johndoe@example.com");
        verify(userRepository).save(user);
    }

    @Test
    void updateMe_Conflict() {
        UserUpdateRequestDto request = new UserUpdateRequestDto("existing@example.com");
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(true);

        assertThatThrownBy(() -> userService.updateMe(request))
                .isInstanceOf(UserAlreadyExist.class);
    }

    @Test
    void changePassword_Success() {
        PasswordChangeRequestDto request = new PasswordChangeRequestDto("oldpass", "newpass");
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("oldpass", "encoded")).thenReturn(true);
        when(passwordEncoder.encode("newpass")).thenReturn("newencoded");

        userService.changePassword(request);

        assertThat(user.getPassword()).isEqualTo("newencoded");
        verify(userRepository).save(user);
        verify(tokenRevocationService).revokeAllUserTokens(USER_ID);
        verify(emailService).sendPasswordChangedAlert(user);
    }

    @Test
    void changePassword_WrongOldPassword() {
        PasswordChangeRequestDto request = new PasswordChangeRequestDto("wrongpass", "newpass");
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongpass", "encoded")).thenReturn(false);

        assertThatThrownBy(() -> userService.changePassword(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Incorrect current password");
    }

    @Test
    void requestInitialPasswordSetup_Success() {
        User oauthUser = User.builder().id(USER_ID).username("oauth_user").email("oauth@test.com").password(null).build();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(oauthUser));

        userService.requestInitialPasswordSetup();

        verify(passwordResetTokenRepository).deleteByUser(oauthUser);
        verify(passwordResetTokenRepository).save(any(PasswordResetToken.class));
        verify(emailService).sendSetInitialPasswordEmail(eq(oauthUser), anyString());
    }

    @Test
    void requestInitialPasswordSetup_AlreadyHasPassword_ThrowsException() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> userService.requestInitialPasswordSetup())
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already has a password set");
    }

    @Test
    void setInitialPassword_Success() {
        User oauthUser = User.builder().id(USER_ID).username("oauth_user").email("oauth@test.com").password(null).build();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(oauthUser));
        when(passwordEncoder.encode("brandNewPassword")).thenReturn("hashedNewPassword");

        userService.setInitialPassword(new PasswordSetRequestDto("brandNewPassword"));

        assertThat(oauthUser.getPassword()).isEqualTo("hashedNewPassword");
        verify(userRepository).save(oauthUser);
    }

    @Test
    void setInitialPassword_AlreadyHasPassword_ThrowsException() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user)); // user has password "encoded"

        assertThatThrownBy(() -> userService.setInitialPassword(new PasswordSetRequestDto("newPass")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already has a password");
    }

    @Test
    void deleteMe_CascadeDeletions() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        Tag tag = Tag.builder().id(10L).user(user).build();
        when(tagRepository.findByUser(user)).thenReturn(List.of(tag));

        userService.deleteMe();

        verify(emailVerificationTokenRepository).deleteByUser(user);
        verify(passwordResetTokenRepository).deleteByUser(user);
        verify(utmTemplateRepository).deleteAll(any());
        verify(customChannelRepository).deleteAll(any());
        verify(clickEventRepository).deleteByUserId(USER_ID);
        verify(urlRepository).deleteAll(any());
        verify(tagRepository).deleteTagAssociations(10L);
        verify(tagRepository).deleteAll(any());
        verify(folderRepository).deleteAll(any());
        verify(tokenRevocationService).revokeAllUserTokens(USER_ID);
        verify(userRepository).delete(user);
    }

    @Test
    void testPublicIdGeneration_User() {
        User newUser = User.builder().username("testuser").role(Role.USER).build();
        newUser.onCreate();
        assertThat(newUser.getPublicId()).startsWith("user_");
        assertThat(newUser.getPublicId()).hasSize("user_".length() + 10);
    }

    @Test
    void testPublicIdGeneration_Root() {
        User rootUser = User.builder().username("root").role(Role.ROOT).build();
        rootUser.onCreate();
        assertThat(rootUser.getPublicId()).startsWith("root_");
        assertThat(rootUser.getPublicId()).hasSize("root_".length() + 10);
    }
}
