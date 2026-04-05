package com.url_shortener.url_shortener.urls;

import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class UrlRepositoryTest {

    @Autowired
    private UrlRepository urlRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FolderRepository folderRepository;

    @Autowired
    private TagRepository tagRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder().email("urltest@example.com").password("pass").build();
        userRepository.save(testUser);

        Folder folder = Folder.builder().name("Test Folder").user(testUser).build();
        folderRepository.save(folder);

        Tag tag = Tag.builder().name("Test Tag").color("#FFF").user(testUser).build();
        tagRepository.save(tag);

        Url url = Url.builder().shortUrl("hash123").longUrl("https://example.com")
                .user(testUser).folder(folder).tags(Set.of(tag)).build();
        urlRepository.save(url);
    }

    @Test
    void findAllByUserIdWithDetails_Success() {
        List<Url> urls = urlRepository.findAllByUserIdWithDetails(testUser.getId());
        
        assertThat(urls).hasSize(1);
        Url retrieved = urls.get(0);
        
        // Ensure no LazyInitializationException by accessing nested entities
        assertThat(retrieved.getFolder().getName()).isEqualTo("Test Folder");
        assertThat(retrieved.getTags()).hasSize(1);
        assertThat(retrieved.getTags().iterator().next().getName()).isEqualTo("Test Tag");
    }
}
