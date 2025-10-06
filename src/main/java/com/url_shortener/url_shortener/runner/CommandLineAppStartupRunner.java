package com.url_shortener.url_shortener.runner;

import com.url_shortener.url_shortener.config.JwtConfig;
import com.url_shortener.url_shortener.entities.Role;
import com.url_shortener.url_shortener.entities.User;
import com.url_shortener.url_shortener.repositories.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@AllArgsConstructor
public class CommandLineAppStartupRunner implements CommandLineRunner {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtConfig jwtConfig;

    @Override
    public void run(String... args) {
        if (!userRepository.existsUserByEmail("root@system.com") || !userRepository.existsUserByName("Root")){
            User rootAdmin =  new User();
            rootAdmin.setName("Root");
            rootAdmin.setEmail(jwtConfig.getRootAdminEmail());
            rootAdmin.setPassword(passwordEncoder.encode(jwtConfig.getRootAdminPassword()));
            rootAdmin.setRole(Role.ROOT);

            userRepository.save(rootAdmin);
        }
    }
}
