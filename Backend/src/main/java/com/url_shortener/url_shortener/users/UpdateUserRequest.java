package com.url_shortener.url_shortener.users;

import jakarta.annotation.Nullable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@AllArgsConstructor
@Getter
@Setter
public class UpdateUserRequest {
    @Nullable
    private String name;

    @Nullable
    private String email;

    @Service
    @AllArgsConstructor
    public static class User implements UserDetailsService {
        private UserRepository userRepository;

        @Override
        public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
            var user = userRepository.findByEmail(email).orElseThrow(
                    () ->  new UsernameNotFoundException("User not found")
            );

            return new org.springframework.security.core.userdetails.User(
                    user.getEmail(),
                    user.getPassword(),
                    Collections.emptyList()
            );
        }
    }
}
