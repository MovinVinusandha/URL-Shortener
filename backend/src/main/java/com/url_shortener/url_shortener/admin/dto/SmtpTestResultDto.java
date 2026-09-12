package com.url_shortener.url_shortener.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SmtpTestResultDto {
    private boolean success;
    private long latencyMs;
    private String host;
    private int port;
    private String fromEmail;
    private String message;
}
