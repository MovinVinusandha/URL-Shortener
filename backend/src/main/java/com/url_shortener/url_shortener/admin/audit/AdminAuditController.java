package com.url_shortener.url_shortener.admin.audit;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/admin/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Admin Audit Logs", description = "Immutable audit log inspection and cryptographic chain validation")
public class AdminAuditController {

    private final AdminAuditService auditService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ROOT')")
    @Operation(summary = "Query and paginate tamper-evident admin audit logs")
    public ResponseEntity<Page<AdminAuditLogDto>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) String actorEmail,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir
    ) {
        Sort sort = sortDir.equalsIgnoreCase("ASC") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        PageRequest pageRequest = PageRequest.of(page, size, sort);
        return ResponseEntity.ok(auditService.getAuditLogs(search, action, targetType, actorEmail, startDate, endDate, pageRequest));
    }

    @GetMapping("/verify")
    @PreAuthorize("hasRole('ROOT')")
    @Operation(summary = "Root-only cryptographic validation of the SHA-256 hash chain")
    public ResponseEntity<AuditChainVerificationDto> verifyChain() {
        return ResponseEntity.ok(auditService.verifyChainIntegrity());
    }

    @GetMapping("/export")
    @PreAuthorize("hasRole('ROOT')")
    @Operation(summary = "Export complete audit trail as JSON or CSV")
    public ResponseEntity<List<AdminAuditLogDto>> exportLogs() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentDispositionFormData("attachment", "trim-audit-logs-" + System.currentTimeMillis() + ".json");
        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.APPLICATION_JSON)
                .body(auditService.getAllLogsForExport());
    }
}
