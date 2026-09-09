package com.url_shortener.url_shortener.auth;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.url_shortener.url_shortener.urls.Folder;
import com.url_shortener.url_shortener.urls.FolderRepository;
import com.url_shortener.url_shortener.users.Role;
import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserOAuthAccount;
import com.url_shortener.url_shortener.users.UserOAuthAccountRepository;
import com.url_shortener.url_shortener.users.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class OAuthService {

    private final UserRepository userRepository;
    private final UserOAuthAccountRepository oauthAccountRepository;
    private final FolderRepository folderRepository;
    private final RestTemplate restTemplate;

    @Value("${app.domain.root:http://localhost:8080}")
    private String rootDomainUrl;

    @Value("${app.dashboard.url:http://localhost:5173}")
    private String dashboardUrl;

    @Value("${oauth.google.client-id:${GOOGLE_CLIENT_ID:}}")
    private String googleClientId;

    @Value("${oauth.google.client-secret:${GOOGLE_CLIENT_SECRET:}}")
    private String googleClientSecret;

    @Value("${oauth.github.client-id:${GITHUB_CLIENT_ID:}}")
    private String githubClientId;

    @Value("${oauth.github.client-secret:${GITHUB_CLIENT_SECRET:}}")
    private String githubClientSecret;

    private final SecureRandom secureRandom = new SecureRandom();

    // Cache state tokens for 10 minutes to prevent CSRF
    private final Cache<String, String> stateCache = Caffeine.newBuilder()
            .expireAfterWrite(10, TimeUnit.MINUTES)
            .maximumSize(10000)
            .build();

    public OAuthService(UserRepository userRepository,
                        UserOAuthAccountRepository oauthAccountRepository,
                        FolderRepository folderRepository,
                        RestTemplate restTemplate) {
        this.userRepository = userRepository;
        this.oauthAccountRepository = oauthAccountRepository;
        this.folderRepository = folderRepository;
        this.restTemplate = restTemplate;
    }

    public boolean isProviderConfigured(String provider) {
        if ("google".equalsIgnoreCase(provider)) {
            return googleClientId != null && !googleClientId.isBlank();
        } else if ("github".equalsIgnoreCase(provider)) {
            return githubClientId != null && !githubClientId.isBlank();
        }
        return false;
    }

    public String generateAuthorizationUrl(String provider) {
        String state = generateSecureState();
        stateCache.put(state, provider.toLowerCase());

        String callbackUrl = getCallbackUrl(provider);

        if ("google".equalsIgnoreCase(provider)) {
            if (!isProviderConfigured("google")) {
                throw new IllegalStateException("Google OAuth is not configured on this server");
            }
            return UriComponentsBuilder.fromHttpUrl("https://accounts.google.com/o/oauth2/v2/auth")
                    .queryParam("client_id", googleClientId)
                    .queryParam("redirect_uri", callbackUrl)
                    .queryParam("response_type", "code")
                    .queryParam("scope", "openid profile email")
                    .queryParam("state", state)
                    .queryParam("access_type", "online")
                    .build()
                    .encode()
                    .toUriString();
        } else if ("github".equalsIgnoreCase(provider)) {
            if (!isProviderConfigured("github")) {
                throw new IllegalStateException("GitHub OAuth is not configured on this server");
            }
            return UriComponentsBuilder.fromHttpUrl("https://github.com/login/oauth/authorize")
                    .queryParam("client_id", githubClientId)
                    .queryParam("redirect_uri", callbackUrl)
                    .queryParam("scope", "read:user user:email")
                    .queryParam("state", state)
                    .build()
                    .encode()
                    .toUriString();
        } else {
            throw new IllegalArgumentException("Unsupported OAuth provider: " + provider);
        }
    }

    @Transactional
    public User processCallback(String provider, String code, String state) {
        // Validate CSRF state
        String cachedProvider = stateCache.getIfPresent(state);
        if (cachedProvider == null || !cachedProvider.equalsIgnoreCase(provider)) {
            throw new IllegalArgumentException("Invalid or expired OAuth state parameter");
        }
        stateCache.invalidate(state);

        OAuthUserInfo userInfo;
        if ("google".equalsIgnoreCase(provider)) {
            userInfo = fetchGoogleUserInfo(code);
        } else if ("github".equalsIgnoreCase(provider)) {
            userInfo = fetchGitHubUserInfo(code);
        } else {
            throw new IllegalArgumentException("Unsupported OAuth provider: " + provider);
        }

        return findOrCreateOAuthUser(provider.toUpperCase(), userInfo);
    }

    private OAuthUserInfo fetchGoogleUserInfo(String code) {
        String tokenUrl = "https://oauth2.googleapis.com/token";
        String callbackUrl = getCallbackUrl("google");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("code", code);
        params.add("client_id", googleClientId);
        params.add("client_secret", googleClientSecret);
        params.add("redirect_uri", callbackUrl);
        params.add("grant_type", "authorization_code");

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                tokenUrl, HttpMethod.POST, request, new ParameterizedTypeReference<>() {}
        );

        Map<String, Object> body = response.getBody();
        if (body == null || !body.containsKey("access_token")) {
            throw new IllegalStateException("Failed to retrieve access token from Google");
        }
        String accessToken = (String) body.get("access_token");

        // Fetch user profile from Google
        HttpHeaders userHeaders = new HttpHeaders();
        userHeaders.setBearerAuth(accessToken);
        HttpEntity<Void> userRequest = new HttpEntity<>(userHeaders);

        ResponseEntity<Map<String, Object>> userResponse = restTemplate.exchange(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                HttpMethod.GET,
                userRequest,
                new ParameterizedTypeReference<>() {}
        );

        Map<String, Object> profile = userResponse.getBody();
        if (profile == null) {
            throw new IllegalStateException("Failed to retrieve Google user profile");
        }

        String sub = String.valueOf(profile.get("sub"));
        String email = (String) profile.get("email");
        String name = (String) profile.get("name");

        return new OAuthUserInfo(sub, email, name, email != null ? email.split("@")[0] : null);
    }

    private OAuthUserInfo fetchGitHubUserInfo(String code) {
        String tokenUrl = "https://github.com/login/oauth/access_token";
        String callbackUrl = getCallbackUrl("github");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("code", code);
        params.add("client_id", githubClientId);
        params.add("client_secret", githubClientSecret);
        params.add("redirect_uri", callbackUrl);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                tokenUrl, HttpMethod.POST, request, new ParameterizedTypeReference<>() {}
        );

        Map<String, Object> body = response.getBody();
        if (body == null || !body.containsKey("access_token")) {
            throw new IllegalStateException("Failed to retrieve access token from GitHub");
        }
        String accessToken = (String) body.get("access_token");

        HttpHeaders userHeaders = new HttpHeaders();
        userHeaders.setBearerAuth(accessToken);
        userHeaders.setAccept(List.of(MediaType.APPLICATION_JSON));
        HttpEntity<Void> userRequest = new HttpEntity<>(userHeaders);

        ResponseEntity<Map<String, Object>> userResponse = restTemplate.exchange(
                "https://api.github.com/user",
                HttpMethod.GET,
                userRequest,
                new ParameterizedTypeReference<>() {}
        );

        Map<String, Object> profile = userResponse.getBody();
        if (profile == null) {
            throw new IllegalStateException("Failed to retrieve GitHub user profile");
        }

        String id = String.valueOf(profile.get("id"));
        String loginUsername = (String) profile.get("login");
        String name = (String) profile.get("name");
        String email = (String) profile.get("email");

        // If email is private, fetch from /user/emails
        if (email == null || email.isBlank()) {
            email = fetchGitHubPrimaryEmail(accessToken);
        }

        return new OAuthUserInfo(id, email, name != null ? name : loginUsername, loginUsername);
    }

    private String fetchGitHubPrimaryEmail(String accessToken) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            HttpEntity<Void> request = new HttpEntity<>(headers);

            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    "https://api.github.com/user/emails",
                    HttpMethod.GET,
                    request,
                    new ParameterizedTypeReference<>() {}
            );

            List<Map<String, Object>> emails = response.getBody();
            if (emails != null) {
                for (Map<String, Object> entry : emails) {
                    Boolean primary = (Boolean) entry.get("primary");
                    Boolean verified = (Boolean) entry.get("verified");
                    if (Boolean.TRUE.equals(primary) && Boolean.TRUE.equals(verified)) {
                        return (String) entry.get("email");
                    }
                }
                if (!emails.isEmpty()) {
                    return (String) emails.get(0).get("email");
                }
            }
        } catch (Exception e) {
            log.warn("Could not fetch secondary emails from GitHub: {}", e.getMessage());
        }
        return null;
    }

    private User findOrCreateOAuthUser(String provider, OAuthUserInfo info) {
        // 1. Check if OAuth account is already linked
        Optional<UserOAuthAccount> existingAccount = oauthAccountRepository.findByProviderAndProviderUserId(provider, info.providerUserId());
        if (existingAccount.isPresent()) {
            return existingAccount.get().getUser();
        }

        // 2. Check if user with that email already exists
        if (info.email() != null && !info.email().isBlank()) {
            Optional<User> userByEmail = userRepository.findByEmail(info.email());
            if (userByEmail.isPresent()) {
                User user = userByEmail.get();
                // Mark email verified because Google/GitHub verified it
                user.setEmailVerified(true);
                if (user.getEmailVerifiedAt() == null) {
                    user.setEmailVerifiedAt(LocalDateTime.now());
                }
                userRepository.save(user);

                // Link OAuth account
                UserOAuthAccount account = UserOAuthAccount.builder()
                        .user(user)
                        .provider(provider)
                        .providerUserId(info.providerUserId())
                        .providerEmail(info.email())
                        .build();
                oauthAccountRepository.save(account);
                return user;
            }
        }

        // 3. User does not exist, create new account
        String uniqueUsername = generateUniqueUsername(info.preferredUsername(), info.email());

        User newUser = User.builder()
                .username(uniqueUsername)
                .email(info.email() != null ? info.email() : uniqueUsername + "@oauth." + provider.toLowerCase() + ".local")
                .password(null) // passwordless OAuth account
                .role(Role.USER)
                .emailVerified(true)
                .emailVerifiedAt(LocalDateTime.now())
                .build();

        userRepository.save(newUser);

        // Create default Links folder
        Folder defaultFolder = Folder.builder()
                .name("Links")
                .slug("links")
                .user(newUser)
                .build();
        folderRepository.save(defaultFolder);

        // Link OAuth account
        UserOAuthAccount account = UserOAuthAccount.builder()
                .user(newUser)
                .provider(provider)
                .providerUserId(info.providerUserId())
                .providerEmail(info.email())
                .build();
        oauthAccountRepository.save(account);

        return newUser;
    }

    private String generateUniqueUsername(String preferred, String email) {
        String base = preferred;
        if (base == null || base.isBlank()) {
            if (email != null && email.contains("@")) {
                base = email.split("@")[0];
            } else {
                base = "user";
            }
        }

        // Normalize: lowercase, keep alphanumeric and underscores only
        base = base.replaceAll("[^a-zA-Z0-9_]", "").toLowerCase();
        if (base.length() < 3) {
            base = base + "user";
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

    public List<String> getConnectedProviders(User user) {
        return oauthAccountRepository.findByUser(user)
                .stream()
                .map(UserOAuthAccount::getProvider)
                .toList();
    }

    @Transactional
    public void unlinkProvider(User user, String provider) {
        String normalizedProvider = provider.toUpperCase();
        var account = oauthAccountRepository.findByUserAndProvider(user, normalizedProvider)
                .orElseThrow(() -> new IllegalArgumentException("Provider " + provider + " is not connected to this account"));

        // Safeguard: Ensure user has a password or another connected provider
        long totalOauth = oauthAccountRepository.findByUser(user).size();
        if (!user.hasPassword() && totalOauth <= 1) {
            throw new IllegalStateException("Cannot disconnect your only authentication method. Please set a password first.");
        }

        oauthAccountRepository.delete(account);
    }

    private String generateSecureState() {
        byte[] bytes = new byte[24];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String getCallbackUrl(String provider) {
        return rootDomainUrl.replaceAll("/$", "") + "/auth/oauth/" + provider.toLowerCase() + "/callback";
    }

    public record OAuthUserInfo(String providerUserId, String email, String displayName, String preferredUsername) {}
}
