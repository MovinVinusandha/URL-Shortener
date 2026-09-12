package com.url_shortener.url_shortener.admin;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@Slf4j
@Service
public class EnvSyncService {

    private static final String[] CANDIDATE_ENV_PATHS = {
            "/app/.env",
            ".env",
            "../.env"
    };

    /**
     * Resolves the available and writable .env file path.
     */
    public Optional<Path> getEnvFilePath() {
        for (String candidate : CANDIDATE_ENV_PATHS) {
            Path path = Paths.get(candidate);
            if (Files.exists(path) && Files.isRegularFile(path)) {
                return Optional.of(path.toAbsolutePath().normalize());
            }
        }
        return Optional.empty();
    }

    /**
     * Reads all key-value pairs directly from the .env file.
     */
    public Map<String, String> readEnvMap() {
        Map<String, String> envMap = new LinkedHashMap<>();
        Optional<Path> envPathOpt = getEnvFilePath();
        if (envPathOpt.isEmpty()) {
            return envMap;
        }

        try {
            List<String> lines = Files.readAllLines(envPathOpt.get(), StandardCharsets.UTF_8);
            for (String line : lines) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                    continue;
                }
                int eqIdx = trimmed.indexOf('=');
                if (eqIdx > 0) {
                    String key = trimmed.substring(0, eqIdx).trim();
                    String value = trimmed.substring(eqIdx + 1).trim();
                    // Strip surrounding quotes if present
                    if ((value.startsWith("\"") && value.endsWith("\"")) ||
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.substring(1, value.length() - 1);
                    }
                    envMap.put(key, value);
                }
            }
        } catch (IOException e) {
            log.warn("Failed to read .env file at {}: {}", envPathOpt.get(), e.getMessage());
        }
        return envMap;
    }

    /**
     * Updates or appends a key-value pair in the .env file preserving structure and comments.
     */
    public synchronized boolean updateEnvVariable(String key, String newValue) {
        if (key == null || key.isBlank()) {
            return false;
        }
        Optional<Path> envPathOpt = getEnvFilePath();
        if (envPathOpt.isEmpty()) {
            log.warn("Cannot update .env variable {}: .env file not found in candidates", key);
            return false;
        }

        Path path = envPathOpt.get();
        try {
            List<String> lines = Files.readAllLines(path, StandardCharsets.UTF_8);
            boolean keyFound = false;
            List<String> updatedLines = new ArrayList<>(lines.size() + 1);

            String targetPrefix = key.trim() + "=";
            for (String line : lines) {
                String trimmed = line.trim();
                if (!trimmed.startsWith("#") && (trimmed.startsWith(targetPrefix) || trimmed.equals(key.trim()))) {
                    // Replace line preserving clean key=value format
                    updatedLines.add(key.trim() + "=" + (newValue != null ? newValue.trim() : ""));
                    keyFound = true;
                } else {
                    updatedLines.add(line);
                }
            }

            if (!keyFound) {
                // Append key=value at the bottom
                updatedLines.add(key.trim() + "=" + (newValue != null ? newValue.trim() : ""));
            }

            Files.write(path, updatedLines, StandardCharsets.UTF_8);
            log.info("Successfully synced {} to .env file at {}", key, path);
            return true;
        } catch (IOException e) {
            log.error("Failed to write update to .env file at {}: {}", path, e.getMessage());
            return false;
        }
    }
}
