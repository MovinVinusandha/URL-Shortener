package com.url_shortener.url_shortener.users;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OAuthAccountDto {
    private String provider;
    private String providerEmail;
    private LocalDateTime connectedAt;
}
