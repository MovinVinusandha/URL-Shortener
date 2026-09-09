package com.url_shortener.url_shortener.common;

import com.url_shortener.url_shortener.users.Role;
import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.url_shortener.url_shortener.urls.Folder;
import com.url_shortener.url_shortener.urls.FolderRepository;

@Component
@RequiredArgsConstructor
public class CommandLineAppStartupRunner implements CommandLineRunner {
    private final UserRepository userRepository;
    private final FolderRepository folderRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${root.user.email}")
    private String rootUserEmail;

    @Value("${root.user.password}")
    private String rootUserPassword;

    @Override
    public void run(String... args) {
        User rootAdmin;
        if (rootUserAlreadyExists()) {
            rootAdmin = userRepository.findByEmail(rootUserEmail).orElse(null);
        } else {
            rootAdmin = new User();
            rootAdmin.setUsername("root");
            rootAdmin.setEmail(rootUserEmail);
            rootAdmin.setPublicId("root_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16));
            rootAdmin.setPassword(passwordEncoder.encode(rootUserPassword));
            rootAdmin.setRole(Role.ROOT);
            rootAdmin = userRepository.save(rootAdmin);
        }

        if (rootAdmin != null) {
            final User targetRoot = rootAdmin;
            if (!folderRepository.existsByUserIdAndSlug(targetRoot.getId(), "links") 
                    && !folderRepository.existsByNameIgnoreCaseAndUserId("Links", targetRoot.getId())) {
                Folder defaultFolder = Folder.builder()
                        .name("Links")
                        .slug("links")
                        .user(targetRoot)
                        .build();
                folderRepository.save(defaultFolder);
            }
        }
    }

    private boolean rootUserAlreadyExists() {
        return userRepository.findByEmail(rootUserEmail).isPresent()
                || userRepository.existsByRole(Role.ROOT);
    }
}
