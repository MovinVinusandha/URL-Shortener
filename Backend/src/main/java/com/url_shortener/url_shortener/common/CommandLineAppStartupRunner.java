package com.url_shortener.url_shortener.common;

import com.url_shortener.url_shortener.auth.JwtConfig;
import com.url_shortener.url_shortener.users.Role;
import com.url_shortener.url_shortener.users.User;
import com.url_shortener.url_shortener.users.UserRepository;
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
