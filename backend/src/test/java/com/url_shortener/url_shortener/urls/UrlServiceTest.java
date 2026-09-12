package com.url_shortener.url_shortener.urls;

import com.url_shortener.url_shortener.analytics.ClickEventRepository;
import com.url_shortener.url_shortener.users.Role;
import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserNotFoundException;
import com.url_shortener.url_shortener.users.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.data.domain.Sort;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigInteger;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UrlServiceTest {

    @Mock
    private UrlMapper urlMapper;
    @Mock
    private UrlRepository urlRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ClickEventRepository clickEventRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private TagRepository tagRepository;
    @Mock
    private FolderRepository folderRepository;
    @Mock
    private CacheManager cacheManager;
    @Mock
    private Cache cache;
    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private UrlService urlService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(urlService, "rootDomainUrl", "http://localhost");
        ReflectionTestUtils.setField(urlService, "cacheManager", cacheManager);
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void shortenUrl_AdminUser_ThrowsAccessDenied() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(1L, null, List.of(new SimpleGrantedAuthority("ROLE_ROOT")))
        );
        UrlRequest request = new UrlRequest("https://example.com", null, null, null, null, null);

        assertThatThrownBy(() -> urlService.generateShortUrl(request))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void shortenUrl_CustomAliasAlreadyExists() {
        UrlRequest request = new UrlRequest("https://example.com", "my-brand", null, null, null, null);
        when(urlRepository.existsUrlByShortUrl("my-brand")).thenReturn(true);

        assertThatThrownBy(() -> urlService.generateShortUrl(request))
                .isInstanceOf(AliasAlreadyExistsException.class);
    }

    @Test
    void shortenUrl_InvalidCustomAlias() {
        UrlRequest request = new UrlRequest("https://example.com", "my/link", null, null, null, null);
        assertThatThrownBy(() -> urlService.generateShortUrl(request))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void shortenUrl_GeneratedHashAlreadyExists() {
        UrlRequest request = new UrlRequest("https://example.com", null, null, null, null, null);
        when(urlRepository.existsUrlByShortUrl(anyString())).thenReturn(true);

        assertThatThrownBy(() -> urlService.generateShortUrl(request))
                .isInstanceOf(UrlExistInDataBaseException.class);
    }

    @Test
    void shortenUrl_WithPassword_Unauthenticated_ThrowsAccessDenied() {
        UrlRequest request = new UrlRequest("https://example.com", null, null, "secret123", null, null);
        when(urlMapper.toEntity(any())).thenReturn(new Url());

        assertThatThrownBy(() -> urlService.generateShortUrl(request))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void shortenUrl_WithPassword_Authenticated_EncodesPassword() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(1L, null, List.of(new SimpleGrantedAuthority("ROLE_USER")))
        );
        User user = User.builder().id(1L).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("secret123")).thenReturn("hashedSecret");

        UrlRequest request = new UrlRequest("https://example.com", null, null, "secret123", null, null);
        Url url = new Url();
        url.setLongUrl("https://example.com");

        when(urlMapper.toEntity(any())).thenReturn(url);
        when(urlRepository.save(any(Url.class))).thenAnswer(inv -> inv.getArgument(0));

        UrlSend expectedSend = new UrlSend("https://example.com", "HASH1", null, null, true, true, null, null, null);
        when(urlMapper.toSendDto(any(Url.class))).thenReturn(expectedSend);

        UrlSend result = urlService.generateShortUrl(request);

        assertThat(result).isNotNull();
        assertThat(url.getPasswordHash()).isEqualTo("hashedSecret");
    }

    @Test
    void shortenUrl_WithTagIds_UnauthorizedOwner_ThrowsAccessDenied() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(1L, null, List.of(new SimpleGrantedAuthority("ROLE_USER")))
        );
        User user = User.builder().id(1L).build();
        User otherUser = User.builder().id(2L).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        Tag foreignTag = Tag.builder().id(50L).user(otherUser).build();
        when(tagRepository.findAllById(List.of(50L))).thenReturn(List.of(foreignTag));

        UrlRequest request = new UrlRequest("https://example.com", null, null, null, List.of(50L), null);
        Url url = new Url();
        when(urlMapper.toEntity(any())).thenReturn(url);

        assertThatThrownBy(() -> urlService.generateShortUrl(request))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void shortenUrl_WithFolderId_UnauthorizedOwner_ThrowsAccessDenied() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(1L, null, List.of(new SimpleGrantedAuthority("ROLE_USER")))
        );
        User user = User.builder().id(1L).build();
        User otherUser = User.builder().id(2L).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        Folder foreignFolder = Folder.builder().id(30L).user(otherUser).build();
        when(folderRepository.findById(30L)).thenReturn(Optional.of(foreignFolder));

        UrlRequest request = new UrlRequest("https://example.com", null, null, null, null, 30L);
        Url url = new Url();
        when(urlMapper.toEntity(any())).thenReturn(url);

        assertThatThrownBy(() -> urlService.generateShortUrl(request))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void shortenUrl_WithDefaultFolder_Success() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(1L, null, List.of(new SimpleGrantedAuthority("ROLE_USER")))
        );
        User user = User.builder().id(1L).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        Folder linksFolder = Folder.builder().id(10L).name("Links").slug("links").user(user).build();
        when(folderRepository.findByUserIdAndSlug(1L, "links")).thenReturn(Optional.of(linksFolder));

        UrlRequest request = new UrlRequest("https://example.com", null, LocalDateTime.now().plusDays(2), null, null, null);
        Url url = new Url();
        url.setLongUrl("https://example.com");

        when(urlMapper.toEntity(any())).thenReturn(url);
        when(urlRepository.save(any(Url.class))).thenAnswer(inv -> inv.getArgument(0));

        UrlSend expectedSend = new UrlSend("https://example.com", "HASH1", null, null, true, false, null, null, null);
        when(urlMapper.toSendDto(any(Url.class))).thenReturn(expectedSend);

        UrlSend result = urlService.generateShortUrl(request);

        assertThat(result).isNotNull();
        assertThat(url.getFolder()).isEqualTo(linksFolder);
        verify(valueOperations).set(startsWith("urls::"), eq("https://example.com"), any(Duration.class));
    }

    @Test
    void shortenUrl_DefaultFolder_FallbackByNameAndCreation() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(1L, null, List.of(new SimpleGrantedAuthority("ROLE_USER")))
        );
        User user = User.builder().id(1L).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        when(folderRepository.findByUserIdAndSlug(1L, "links")).thenReturn(Optional.empty());
        when(folderRepository.findByNameIgnoreCaseAndUserId("Links", 1L)).thenReturn(Optional.empty());

        Folder createdDefault = Folder.builder().id(20L).name("Links").slug("links").user(user).build();
        when(folderRepository.save(any(Folder.class))).thenReturn(createdDefault);

        UrlRequest request = new UrlRequest("https://example.com", null, null, null, null, null);
        Url url = new Url();
        url.setLongUrl("https://example.com");

        when(urlMapper.toEntity(any())).thenReturn(url);
        when(urlRepository.save(any(Url.class))).thenAnswer(inv -> inv.getArgument(0));

        UrlSend expectedSend = new UrlSend("https://example.com", "HASH1", null, null, true, false, null, null, null);
        when(urlMapper.toSendDto(any(Url.class))).thenReturn(expectedSend);

        UrlSend result = urlService.generateShortUrl(request);

        assertThat(result).isNotNull();
        assertThat(url.getFolder()).isEqualTo(createdDefault);
    }

    @Test
    void shortenUrl_ExpiredDateInPast_SetsInactive() {
        UrlRequest request = new UrlRequest("https://example.com", null, LocalDateTime.now().minusDays(1), null, null, null);
        Url url = new Url();
        when(urlMapper.toEntity(any())).thenReturn(url);
        when(urlRepository.save(any(Url.class))).thenAnswer(inv -> inv.getArgument(0));
        UrlSend expectedSend = new UrlSend("https://example.com", "HASH1", null, null, false, false, null, null, null);
        when(urlMapper.toSendDto(any(Url.class))).thenReturn(expectedSend);

        UrlSend result = urlService.generateShortUrl(request);

        assertThat(result).isNotNull();
        assertThat(url.isActive()).isFalse();
    }

    @Test
    void getLongUrlForRedirect_Expired_ThrowsLinkExpiredException() {
        Url url = Url.builder().id(1L).shortUrl("expHash").isActive(true).expiresAt(LocalDateTime.now().minusMinutes(5)).build();
        when(urlRepository.findByShortUrl("expHash")).thenReturn(url);

        assertThatThrownBy(() -> urlService.getLongUrlForRedirect("expHash"))
                .isInstanceOf(LinkExpiredException.class);

        assertThat(url.isActive()).isFalse();
        verify(urlRepository, times(2)).save(url);
        verify(redisTemplate, times(2)).delete("urls::expHash");
    }

    @Test
    void getLongUrlForRedirect_Inactive_ThrowsLinkExpiredException() {
        Url url = Url.builder().id(1L).shortUrl("inact").isActive(false).build();
        when(urlRepository.findByShortUrl("inact")).thenReturn(url);

        assertThatThrownBy(() -> urlService.getLongUrlForRedirect("inact"))
                .isInstanceOf(LinkExpiredException.class);
    }

    @Test
    void getLongUrlForRedirect_PasswordProtected_ThrowsPasswordProtectedException() {
        Url url = Url.builder().id(1L).shortUrl("secHash").isActive(true).passwordHash("someHash").build();
        when(urlRepository.findByShortUrl("secHash")).thenReturn(url);

        assertThatThrownBy(() -> urlService.getLongUrlForRedirect("secHash"))
                .isInstanceOf(PasswordProtectedException.class);
    }

    @Test
    void getLongUrlForRedirect_RedisCacheHit() {
        Url url = Url.builder().id(1L).shortUrl("cachedHash").isActive(true).longUrl("https://destination.com").build();
        when(urlRepository.findByShortUrl("cachedHash")).thenReturn(url);
        when(valueOperations.get("urls::cachedHash")).thenReturn("https://destination.com");

        String result = urlService.getLongUrlForRedirect("cachedHash");

        assertThat(result).isEqualTo("https://destination.com");
    }

    @Test
    void getLongUrlForRedirect_RedisCacheMiss_CachesAndReturns() {
        Url url = Url.builder().id(1L).shortUrl("missHash").isActive(true).longUrl("https://destination.com").build();
        when(urlRepository.findByShortUrl("missHash")).thenReturn(url);
        when(valueOperations.get("urls::missHash")).thenReturn(null);

        String result = urlService.getLongUrlForRedirect("missHash");

        assertThat(result).isEqualTo("https://destination.com");
        verify(valueOperations).set("urls::missHash", "https://destination.com", Duration.ofHours(24));
    }

    @Test
    void getUrlForUnlock_Success() {
        Url url = Url.builder().id(1L).shortUrl("unlockHash").isActive(true).passwordHash("encodedPass").longUrl("https://secret.com").build();
        when(urlRepository.findByShortUrl("unlockHash")).thenReturn(url);
        when(passwordEncoder.matches("myPass", "encodedPass")).thenReturn(true);

        String result = urlService.getUrlForUnlock("unlockHash", "myPass");

        assertThat(result).isEqualTo("https://secret.com");
    }

    @Test
    void getUrlForUnlock_BadCredentials_ThrowsException() {
        Url url = Url.builder().id(1L).shortUrl("unlockHash").isActive(true).passwordHash("encodedPass").longUrl("https://secret.com").build();
        when(urlRepository.findByShortUrl("unlockHash")).thenReturn(url);
        when(passwordEncoder.matches("wrongPass", "encodedPass")).thenReturn(false);

        assertThatThrownBy(() -> urlService.getUrlForUnlock("unlockHash", "wrongPass"))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void getUrlForUnlock_NotPasswordProtected_ThrowsException() {
        Url url = Url.builder().id(1L).shortUrl("openHash").isActive(true).passwordHash(null).build();
        when(urlRepository.findByShortUrl("openHash")).thenReturn(url);

        assertThatThrownBy(() -> urlService.getUrlForUnlock("openHash", "any"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void getUrl_Success() {
        User user = User.builder().id(1L).build();
        Url url = Url.builder().id(1L).shortUrl("hash1").user(user).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(1L, null, List.of())
        );

        when(urlRepository.findByShortUrl("hash1")).thenReturn(url);
        UrlDto dto = new UrlDto(BigInteger.ONE, "https://long.com", "hash1", BigInteger.ZERO, null, null, null, true, false, null, null, null);
        when(urlMapper.toDto(url)).thenReturn(dto);
        when(clickEventRepository.countByUrl_Id(eq(1L), any(), any())).thenReturn(10L);

        UrlDto result = urlService.getUrl("hash1");

        assertThat(result).isNotNull();
        assertThat(result.getAccessed_times()).isEqualTo(BigInteger.valueOf(10L));
    }

    @Test
    void getAllUrls_Admin_SortByClickCount() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(1L, null, List.of(new SimpleGrantedAuthority("ROLE_ROOT")))
        );

        Url url1 = Url.builder().id(1L).shortUrl("h1").build();
        Url url2 = Url.builder().id(2L).shortUrl("h2").build();

        when(urlRepository.findByUserIdAndFolderIsNull(1L)).thenReturn(List.of());
        when(urlRepository.findAllByUserIdWithFilters(1L, null, null, null, null)).thenReturn(new ArrayList<>(List.of(url1, url2)));

        UrlDto dto1 = new UrlDto(BigInteger.ONE, "https://long1.com", "h1", BigInteger.valueOf(5L), null, null, null, true, false, null, null, null);
        UrlDto dto2 = new UrlDto(BigInteger.TWO, "https://long2.com", "h2", BigInteger.valueOf(20L), null, null, null, true, false, null, null, null);

        when(urlMapper.toDto(url1)).thenReturn(dto1);
        when(urlMapper.toDto(url2)).thenReturn(dto2);
        when(clickEventRepository.countByUrl_Id(eq(1L), any(), any())).thenReturn(5L);
        when(clickEventRepository.countByUrl_Id(eq(2L), any(), any())).thenReturn(20L);

        List<UrlDto> result = urlService.getAllUrls("accessed_times", null, null, null, null);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getId()).isEqualTo(BigInteger.TWO);
        assertThat(result.get(1).getId()).isEqualTo(BigInteger.ONE);
    }

    @Test
    void getAllUrls_User_WithUnassignedUrlsAndFilters() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(1L, null, List.of(new SimpleGrantedAuthority("ROLE_USER")))
        );

        User user = User.builder().id(1L).build();
        Folder linksFolder = Folder.builder().id(10L).name("Links").build();
        Url unassigned = Url.builder().id(100L).user(user).build();

        when(urlRepository.findByUserIdAndFolderIsNull(1L)).thenReturn(List.of(unassigned));
        when(folderRepository.findByNameIgnoreCaseAndUserId("Links", 1L)).thenReturn(Optional.of(linksFolder));

        Url url = Url.builder().id(1L).shortUrl("h1").user(user).folder(linksFolder).build();
        when(urlRepository.findAllByUserIdWithFilters(eq(1L), eq(null), eq(10L), eq(null), eq("search"))).thenReturn(new ArrayList<>(List.of(url)));

        UrlDto dto = new UrlDto(BigInteger.ONE, "https://long.com", "h1", BigInteger.ZERO, null, null, null, true, false, null, 10L, "Links");
        when(urlMapper.toDto(url)).thenReturn(dto);
        when(clickEventRepository.countByUrl_Id(eq(1L), any(), any())).thenReturn(3L);

        List<UrlDto> result = urlService.getAllUrls("id", null, 10L, null, "search");

        assertThat(result).hasSize(1);
        assertThat(unassigned.getFolder()).isEqualTo(linksFolder);
        verify(urlRepository).saveAll(List.of(unassigned));
    }

    @Test
    void updateUrl_ByUrlRequest_Success() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(1L, null, List.of())
        );
        User user = User.builder().id(1L).build();
        Url url = Url.builder().id(1L).shortUrl("oldHash").user(user).build();

        when(urlRepository.findByShortUrl("oldHash")).thenReturn(url);
        when(urlRepository.existsUrlByShortUrl("newHash")).thenReturn(false);
        when(cacheManager.getCache("urls")).thenReturn(cache);

        UrlRequest request = new UrlRequest("https://new.com", "newHash", LocalDateTime.now().plusDays(1), null, null, null);
        UrlUpdateDto updateDto = new UrlUpdateDto("https://new.com", "newHash", LocalDateTime.now(), null);
        when(urlMapper.toUpdateDto(url)).thenReturn(updateDto);

        UrlUpdateDto result = urlService.updateUrl(request, "oldHash");

        assertThat(result).isNotNull();
        assertThat(url.getShortUrl()).isEqualTo("newHash");
        verify(cache).evict("newHash");
    }

    @Test
    void updateUrl_ByUrlRequest_ExpiredInPast_SetsInactive() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(1L, null, List.of())
        );
        User user = User.builder().id(1L).build();
        Url url = Url.builder().id(1L).shortUrl("oldHash").user(user).build();

        when(urlRepository.findByShortUrl("oldHash")).thenReturn(url);
        when(cacheManager.getCache("urls")).thenReturn(cache);

        UrlRequest request = new UrlRequest("https://new.com", null, LocalDateTime.now().minusDays(1), null, null, null);
        doAnswer(inv -> {
            url.setExpiresAt(request.getExpiresAt());
            return null;
        }).when(urlMapper).updateUrl(any(), any());
        UrlUpdateDto updateDto = new UrlUpdateDto("https://new.com", "oldHash", LocalDateTime.now(), null);
        when(urlMapper.toUpdateDto(url)).thenReturn(updateDto);

        UrlUpdateDto result = urlService.updateUrl(request, "oldHash");

        assertThat(result).isNotNull();
        assertThat(url.isActive()).isFalse();
    }

    @Test
    void updateUrl_ByUpdateRequestDto_Success() {
        User user = User.builder().id(1L).role(Role.USER).build();
        Url url = Url.builder().id(1L).shortUrl("hash123").user(user).isActive(true).build();

        when(urlRepository.findByShortUrl("hash123")).thenReturn(url);
        when(urlRepository.save(any(Url.class))).thenAnswer(inv -> inv.getArgument(0));
        when(cacheManager.getCache("urls")).thenReturn(cache);
        when(passwordEncoder.encode("newSecret")).thenReturn("newHashedSecret");

        Tag tag = Tag.builder().id(5L).user(user).build();
        when(tagRepository.findAllById(List.of(5L))).thenReturn(List.of(tag));

        UrlUpdateRequestDto req = new UrlUpdateRequestDto();
        req.setLongUrl("https://updated.com");
        req.setPassword("newSecret");
        req.setTagIds(List.of(5L));
        req.setExpiresAt(LocalDateTime.now().plusDays(5));

        UrlDto mockDto = new UrlDto(BigInteger.ONE, "https://updated.com", "hash123", BigInteger.ZERO, null, null, null, true, true, null, null, null);
        when(urlMapper.toDto(url)).thenReturn(mockDto);
        when(clickEventRepository.countByUrl_Id(eq(1L), any(), any())).thenReturn(0L);

        UrlDto result = urlService.updateUrl("hash123", req, user);

        assertThat(result).isNotNull();
        assertThat(url.getLongUrl()).isEqualTo("https://updated.com");
        assertThat(url.getPasswordHash()).isEqualTo("newHashedSecret");
        verify(redisTemplate).delete("urls::hash123");
        verify(cache).evict("hash123");
    }

    @Test
    void updateUrl_ByUpdateRequestDto_ClearPassword_AdminOwner() {
        User admin = User.builder().id(99L).role(Role.ROOT).build();
        User owner = User.builder().id(1L).role(Role.USER).build();
        Url url = Url.builder().id(1L).shortUrl("hash123").user(owner).passwordHash("existingSecret").build();

        when(urlRepository.findByShortUrl("hash123")).thenReturn(url);
        when(urlRepository.save(any(Url.class))).thenAnswer(inv -> inv.getArgument(0));
        when(cacheManager.getCache("urls")).thenReturn(cache);

        UrlUpdateRequestDto req = new UrlUpdateRequestDto();
        req.setPassword(""); // Clear password
        req.setExpiresAt(LocalDateTime.now().minusDays(1)); // In past

        UrlDto mockDto = new UrlDto(BigInteger.ONE, "https://updated.com", "hash123", BigInteger.ZERO, null, null, null, false, false, null, null, null);
        when(urlMapper.toDto(url)).thenReturn(mockDto);
        when(clickEventRepository.countByUrl_Id(eq(1L), any(), any())).thenReturn(0L);

        UrlDto result = urlService.updateUrl("hash123", req, admin);

        assertThat(result).isNotNull();
        assertThat(url.getPasswordHash()).isNull();
        assertThat(url.isActive()).isFalse();
    }

    @Test
    void updateUrl_ByUpdateRequestDto_Unauthorized_ThrowsAccessDenied() {
        User user = User.builder().id(1L).role(Role.USER).build();
        User otherUser = User.builder().id(2L).role(Role.USER).build();
        Url url = Url.builder().id(1L).shortUrl("hash123").user(otherUser).build();

        when(urlRepository.findByShortUrl("hash123")).thenReturn(url);

        UrlUpdateRequestDto req = new UrlUpdateRequestDto();

        assertThatThrownBy(() -> urlService.updateUrl("hash123", req, user))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void deleteUrl_Success() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(1L, null, List.of())
        );
        User user = User.builder().id(1L).build();
        Url url = Url.builder().id(1L).shortUrl("delHash").user(user).build();
        when(urlRepository.findByShortUrl("delHash")).thenReturn(url);

        urlService.deleteUrl("delHash");

        verify(urlRepository).delete(url);
    }

    @Test
    void toDtoWithClickCountSafe_Exception_ReturnsNull() {
        Url url = Url.builder().id(999L).build();
        when(urlMapper.toDto(url)).thenThrow(new RuntimeException("Mapping error"));

        UrlDto result = ReflectionTestUtils.invokeMethod(urlService, "toDtoWithClickCountSafe", url);
        assertThat(result).isNull();
    }

    @Test
    void isUserCorrect_RootRoleAuthority_Passes() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(99L, null, List.of(new SimpleGrantedAuthority("ROLE_ROOT")))
        );
        User owner = User.builder().id(1L).build();
        Url url = Url.builder().id(10L).user(owner).build();

        // Should not throw
        ReflectionTestUtils.invokeMethod(UrlService.class, "isUserCorrect", url);
    }

    @Test
    void isUserCorrect_RootAuthorityWithoutPrefix_Passes() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(99L, null, List.of(new SimpleGrantedAuthority("ROOT")))
        );
        User owner = User.builder().id(1L).build();
        Url url = Url.builder().id(10L).user(owner).build();

        // Should not throw
        ReflectionTestUtils.invokeMethod(UrlService.class, "isUserCorrect", url);
    }

    @Test
    void isExistsShortUrl_ActiveAndExpired_Deactivates() {
        Url url = Url.builder()
                .id(10L)
                .shortUrl("expiredHash")
                .isActive(true)
                .expiresAt(LocalDateTime.now().minusHours(2))
                .build();
        when(urlRepository.findByShortUrl("expiredHash")).thenReturn(url);

        Url result = ReflectionTestUtils.invokeMethod(urlService, "isExistsShortUrl", "expiredHash");

        assertThat(result).isNotNull();
        assertThat(result.isActive()).isFalse();
        verify(urlRepository).save(url);
    }

    @Test
    void createBatchCampaignUrls_Success() {
        User user = User.builder().id(1L).role(Role.USER).build();
        Folder folder = Folder.builder().id(10L).user(user).name("Campaigns").build();
        when(folderRepository.findById(10L)).thenReturn(Optional.of(folder));

        Tag tag = Tag.builder().id(5L).user(user).name("Promo").build();
        when(tagRepository.findAllById(List.of(5L))).thenReturn(List.of(tag));

        when(urlRepository.existsUrlByShortUrl(any())).thenReturn(false);
        when(urlRepository.save(any(Url.class))).thenAnswer(invocation -> {
            Url u = invocation.getArgument(0);
            u.setId(100L);
            return u;
        });

        BatchChannelItemDto ch1 = BatchChannelItemDto.builder()
                .name("Facebook")
                .utmSource("facebook")
                .utmMedium("social")
                .build();
        BatchChannelItemDto ch2 = BatchChannelItemDto.builder()
                .name("Twitter")
                .utmSource("twitter")
                .utmMedium("social")
                .build();

        BatchCampaignRequestDto request = BatchCampaignRequestDto.builder()
                .longUrl("https://example.com/product")
                .campaignName("summer_sale")
                .folderId(10L)
                .tagIds(List.of(5L))
                .channels(List.of(ch1, ch2))
                .build();

        ReflectionTestUtils.setField(urlService, "rootDomainUrl", "http://localhost");

        BatchCampaignResponseDto response = urlService.createBatchCampaignUrls(request, user);

        assertThat(response).isNotNull();
        assertThat(response.getCampaignName()).isEqualTo("summer_sale");
        assertThat(response.getTotalCreated()).isEqualTo(2);
        assertThat(response.getItems()).hasSize(2);
        assertThat(response.getItems().get(0).getChannelName()).isEqualTo("Facebook");
        assertThat(response.getItems().get(0).getLongUrlWithUtm()).contains("utm_source=facebook");
        assertThat(response.getItems().get(0).getLongUrlWithUtm()).contains("utm_campaign=summer_sale");
        assertThat(response.getItems().get(1).getChannelName()).isEqualTo("Twitter");
        assertThat(response.getItems().get(1).getLongUrlWithUtm()).contains("utm_source=twitter");
    }

    @Test
    void createBatchCampaignUrls_AdminRole_ThrowsAccessDenied() {
        User adminUser = User.builder().id(99L).role(Role.ADMIN).build();
        BatchCampaignRequestDto request = BatchCampaignRequestDto.builder()
                .longUrl("https://example.com")
                .campaignName("promo")
                .channels(List.of(BatchChannelItemDto.builder().name("FB").utmSource("facebook").build()))
                .build();

        assertThatThrownBy(() -> urlService.createBatchCampaignUrls(request, adminUser))
                .isInstanceOf(AccessDeniedException.class);
    }
}
