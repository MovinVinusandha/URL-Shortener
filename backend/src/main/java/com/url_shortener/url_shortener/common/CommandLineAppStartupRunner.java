package com.url_shortener.url_shortener.common;

import com.url_shortener.url_shortener.users.Role;
import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommandLineAppStartupRunner implements CommandLineRunner {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${root.user.email}")
    private String rootUserEmail;

    @Value("${root.user.password}")
    private String rootUserPassword;

    @Override
    public void run(String... args) {
        if (rootUserAlreadyExists()) {
            return;
        }

        User rootAdmin = new User();
        rootAdmin.setName("Root");
        rootAdmin.setEmail(rootUserEmail);
        rootAdmin.setPassword(passwordEncoder.encode(rootUserPassword));
        rootAdmin.setRole(Role.ROOT);

        userRepository.save(rootAdmin);
    }

    private boolean rootUserAlreadyExists() {
        return userRepository.findByEmail(rootUserEmail).isPresent()
                || userRepository.existsByRole(Role.ROOT);
    }
}
