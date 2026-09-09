package com.url_shortener.url_shortener.auth;

import com.url_shortener.url_shortener.urls.FolderRepository;
import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserOAuthAccount;
import com.url_shortener.url_shortener.users.UserOAuthAccountRepository;
import com.url_shortener.url_shortener.users.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OAuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private UserOAuthAccountRepository oauthAccountRepository;
    @Mock
    private FolderRepository folderRepository;
    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private OAuthService oauthService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(oauthService, "rootDomainUrl", "http://localhost:8080");
        ReflectionTestUtils.setField(oauthService, "dashboardUrl", "http://localhost:5173");
        ReflectionTestUtils.setField(oauthService, "googleClientId", "google-client-id");
        ReflectionTestUtils.setField(oauthService, "googleClientSecret", "google-client-secret");
        ReflectionTestUtils.setField(oauthService, "githubClientId", "github-client-id");
        ReflectionTestUtils.setField(oauthService, "githubClientSecret", "github-client-secret");
    }

    @Test
    void isProviderConfigured_ReturnsTrueWhenCredentialsSet() {
        assertThat(oauthService.isProviderConfigured("google")).isTrue();
        assertThat(oauthService.isProviderConfigured("github")).isTrue();
        assertThat(oauthService.isProviderConfigured("twitter")).isFalse();
    }

    @Test
    void isProviderConfigured_ReturnsFalseWhenCredentialsEmpty() {
        ReflectionTestUtils.setField(oauthService, "googleClientId", "");
        assertThat(oauthService.isProviderConfigured("google")).isFalse();
    }

    @Test
    void generateAuthorizationUrl_Google_Success() {
        String url = oauthService.generateAuthorizationUrl("google");

        assertThat(url).contains("https://accounts.google.com/o/oauth2/v2/auth");
        assertThat(url).contains("client_id=google-client-id");
        assertThat(url).contains("state=");
        assertThat(url).contains("prompt=select_account");
        assertThat(url).contains("redirect_uri=http://localhost:8080/auth/oauth/google/callback");
    }

    @Test
    void generateAuthorizationUrl_GitHub_Success() {
        String url = oauthService.generateAuthorizationUrl("github");

        assertThat(url).contains("https://github.com/login/oauth/authorize");
        assertThat(url).contains("client_id=github-client-id");
        assertThat(url).contains("state=");
        assertThat(url).contains("redirect_uri=http://localhost:8080/auth/oauth/github/callback");
    }

    @Test
    void unlinkProvider_ThrowsExceptionIfOnlyAuthMethod() {
        User user = User.builder().id(1L).email("user@test.com").password(null).build(); // No password
        UserOAuthAccount account = UserOAuthAccount.builder().user(user).provider("GOOGLE").build();

        when(oauthAccountRepository.findByUserAndProvider(user, "GOOGLE")).thenReturn(Optional.of(account));
        when(oauthAccountRepository.findByUser(user)).thenReturn(List.of(account)); // only 1 OAuth account

        assertThatThrownBy(() -> oauthService.unlinkProvider(user, "GOOGLE"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot disconnect your only authentication method");
    }

    @Test
    void unlinkProvider_SuccessIfHasPassword() {
        User user = User.builder().id(1L).email("user@test.com").password("hashed_password").build();
        UserOAuthAccount account = UserOAuthAccount.builder().user(user).provider("GOOGLE").build();

        when(oauthAccountRepository.findByUserAndProvider(user, "GOOGLE")).thenReturn(Optional.of(account));
        when(oauthAccountRepository.findByUser(user)).thenReturn(List.of(account));

        oauthService.unlinkProvider(user, "GOOGLE");

        verify(oauthAccountRepository).delete(account);
    }
}
