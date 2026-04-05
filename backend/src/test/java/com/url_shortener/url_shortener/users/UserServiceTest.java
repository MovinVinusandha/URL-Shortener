package com.url_shortener.url_shortener.users;

import com.url_shortener.url_shortener.analytics.ClickEventRepository;
import com.url_shortener.url_shortener.urls.FolderRepository;
import com.url_shortener.url_shortener.urls.TagRepository;
import com.url_shortener.url_shortener.urls.UrlRepository;
import com.url_shortener.url_shortener.urls.Tag;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.List;
import java.util.Collections;

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

    @InjectMocks
    private UserService userService;

    private User user;
    private final Long USER_ID = 1L;

    @BeforeEach
    void setUp() {
        user = User.builder().id(USER_ID).name("John").email("john@example.com").password("encoded").role(Role.USER).build();
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(USER_ID, null, Collections.emptyList())
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void updateMe_Success() {
        UserUpdateRequestDto request = new UserUpdateRequestDto("John Doe", "johndoe@example.com");
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(userRepository.existsUserByEmail(request.getEmail())).thenReturn(false);

        User updatedUser = userService.updateMe(request);

        assertThat(updatedUser.getName()).isEqualTo("John Doe");
        assertThat(updatedUser.getEmail()).isEqualTo("johndoe@example.com");
        verify(userRepository).save(user);
    }

    @Test
    void updateMe_Conflict() {
        UserUpdateRequestDto request = new UserUpdateRequestDto("John Doe", "existing@example.com");
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(userRepository.existsUserByEmail(request.getEmail())).thenReturn(true);

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
    void deleteMe_CascadeDeletions() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        Tag tag = Tag.builder().id(10L).user(user).build();
        when(tagRepository.findByUser(user)).thenReturn(List.of(tag));

        userService.deleteMe();

        verify(clickEventRepository).deleteByUserId(USER_ID);
        verify(urlRepository).deleteAll(any());
        verify(tagRepository).deleteTagAssociations(10L);
        verify(tagRepository).deleteAll(any());
        verify(folderRepository).deleteAll(any());
        verify(userRepository).delete(user);
    }
}
