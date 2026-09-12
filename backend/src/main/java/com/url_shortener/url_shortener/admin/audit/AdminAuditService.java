package com.url_shortener.url_shortener.admin.audit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminAuditService {

    public static final String GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
    public static final DateTimeFormatter HASH_TIMESTAMP_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS");

    private final AdminAuditLogRepository auditLogRepository;

    /**
     * Records an immutable admin action with SHA-256 hash chaining.
     * Uses REQUIRES_NEW propagation to ensure audit records are written even if subsequent operations fail.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public synchronized AdminAuditLog record(
            Long actorId,
            String actorEmail,
            String actorRole,
            String actorIp,
            String action,
            String targetType,
            String targetIdentifier,
            String details,
            String metadataJson
    ) {
        String prevHash = auditLogRepository.findTopByOrderByIdDesc()
                .map(AdminAuditLog::getEntryHash)
                .orElse(GENESIS_HASH);

        LocalDateTime now = LocalDateTime.now().truncatedTo(ChronoUnit.MILLIS);
        String formattedTimestamp = now.format(HASH_TIMESTAMP_FORMATTER);

        String rawContent = String.join("|",
                prevHash,
                String.valueOf(actorId),
                actorEmail != null ? actorEmail : "",
                actorRole != null ? actorRole : "",
                actorIp != null ? actorIp : "",
                action != null ? action : "",
                targetType != null ? targetType : "",
                targetIdentifier != null ? targetIdentifier : "",
                details != null ? details : "",
                metadataJson != null ? metadataJson : "",
                formattedTimestamp
        );

        String entryHash = computeSha256(rawContent);

        AdminAuditLog logEntry = AdminAuditLog.builder()
                .actorId(actorId)
                .actorEmail(actorEmail != null ? actorEmail : "SYSTEM")
                .actorRole(actorRole != null ? actorRole : "SYSTEM")
                .actorIp(actorIp)
                .action(action)
                .targetType(targetType)
                .targetIdentifier(targetIdentifier)
                .details(details)
                .metadataJson(metadataJson)
                .prevHash(prevHash)
                .entryHash(entryHash)
                .createdAt(now)
                .build();

        AdminAuditLog saved = auditLogRepository.save(logEntry);
        log.info("[AUDIT] Recorded {} by {} on {}:{} [hash={}]", action, actorEmail, targetType, targetIdentifier, entryHash.substring(0, 12));
        return saved;
    }

    /**
     * Cryptographically validates the full hash chain from Genesis to latest.
     */
    @Transactional(readOnly = true)
    public AuditChainVerificationDto verifyChainIntegrity() {
        List<AdminAuditLog> allLogs = auditLogRepository.findAllByOrderByIdAsc();
        if (allLogs.isEmpty()) {
            return AuditChainVerificationDto.builder()
                    .valid(true)
                    .totalVerified(0)
                    .genesisHash(GENESIS_HASH)
                    .latestHash(GENESIS_HASH)
                    .verifiedAt(LocalDateTime.now())
                    .build();
        }

        String expectedPrevHash = GENESIS_HASH;

        for (int i = 0; i < allLogs.size(); i++) {
            AdminAuditLog entry = allLogs.get(i);

            // 1. Validate previous hash linkage
            if (!Objects.equals(entry.getPrevHash(), expectedPrevHash)) {
                return AuditChainVerificationDto.builder()
                        .valid(false)
                        .totalVerified(i)
                        .genesisHash(GENESIS_HASH)
                        .latestHash(entry.getEntryHash())
                        .tamperedEntryId(entry.getId())
                        .failureReason("Broken hash chain link at ID " + entry.getId() + ". Expected prevHash " + expectedPrevHash + " but found " + entry.getPrevHash())
                        .verifiedAt(LocalDateTime.now())
                        .build();
            }

            // 2. Recalculate entry hash
            String formattedCreatedAt = entry.getCreatedAt() != null
                    ? entry.getCreatedAt().truncatedTo(ChronoUnit.MILLIS).format(HASH_TIMESTAMP_FORMATTER)
                    : "";

            String rawContent = String.join("|",
                    entry.getPrevHash(),
                    String.valueOf(entry.getActorId()),
                    entry.getActorEmail() != null ? entry.getActorEmail() : "",
                    entry.getActorRole() != null ? entry.getActorRole() : "",
                    entry.getActorIp() != null ? entry.getActorIp() : "",
                    entry.getAction() != null ? entry.getAction() : "",
                    entry.getTargetType() != null ? entry.getTargetType() : "",
                    entry.getTargetIdentifier() != null ? entry.getTargetIdentifier() : "",
                    entry.getDetails() != null ? entry.getDetails() : "",
                    entry.getMetadataJson() != null ? entry.getMetadataJson() : "",
                    formattedCreatedAt
            );

            String calculatedHash = computeSha256(rawContent);
            if (!Objects.equals(calculatedHash, entry.getEntryHash())) {
                return AuditChainVerificationDto.builder()
                        .valid(false)
                        .totalVerified(i)
                        .genesisHash(GENESIS_HASH)
                        .latestHash(entry.getEntryHash())
                        .tamperedEntryId(entry.getId())
                        .failureReason("Tampered entry payload at ID " + entry.getId() + ". Stored hash does not match computed hash.")
                        .verifiedAt(LocalDateTime.now())
                        .build();
            }

            expectedPrevHash = entry.getEntryHash();
        }

        return AuditChainVerificationDto.builder()
                .valid(true)
                .totalVerified(allLogs.size())
                .genesisHash(GENESIS_HASH)
                .latestHash(expectedPrevHash)
                .verifiedAt(LocalDateTime.now())
                .build();
    }

    @Transactional(readOnly = true)
    public Page<AdminAuditLogDto> getAuditLogs(
            String search,
            String action,
            String targetType,
            String actorEmail,
            LocalDateTime startDate,
            LocalDateTime endDate,
            Pageable pageable
    ) {
        Specification<AdminAuditLog> spec = Specification.where(null);

        if (action != null && !action.isBlank() && !action.equalsIgnoreCase("ALL")) {
            spec = spec.and((root, query, cb) -> cb.equal(cb.upper(root.get("action")), action.toUpperCase()));
        }

        if (targetType != null && !targetType.isBlank() && !targetType.equalsIgnoreCase("ALL")) {
            spec = spec.and((root, query, cb) -> cb.equal(cb.upper(root.get("targetType")), targetType.toUpperCase()));
        }

        if (actorEmail != null && !actorEmail.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("actorEmail")), "%" + actorEmail.toLowerCase() + "%"));
        }

        if (startDate != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), startDate));
        }

        if (endDate != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("createdAt"), endDate));
        }

        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.toLowerCase().trim() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("targetIdentifier")), pattern),
                    cb.like(cb.lower(root.get("details")), pattern),
                    cb.like(cb.lower(root.get("actorEmail")), pattern),
                    cb.like(cb.lower(root.get("action")), pattern),
                    cb.like(cb.lower(root.get("entryHash")), pattern)
            ));
        }

        return auditLogRepository.findAll(spec, pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public List<AdminAuditLogDto> getAllLogsForExport() {
        return auditLogRepository.findAllByOrderByIdAsc().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public AdminAuditLogDto toDto(AdminAuditLog entity) {
        return AdminAuditLogDto.builder()
                .id(entity.getId())
                .actorId(entity.getActorId())
                .actorEmail(entity.getActorEmail())
                .actorRole(entity.getActorRole())
                .actorIp(entity.getActorIp())
                .action(entity.getAction())
                .targetType(entity.getTargetType())
                .targetIdentifier(entity.getTargetIdentifier())
                .details(entity.getDetails())
                .metadataJson(entity.getMetadataJson())
                .prevHash(entity.getPrevHash())
                .entryHash(entity.getEntryHash())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    private String computeSha256(String data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
}
