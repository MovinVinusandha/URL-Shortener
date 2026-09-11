package com.url_shortener.url_shortener.admin;

import com.url_shortener.url_shortener.admin.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@Tag(name = "Admin Portal", description = "Administration and platform monitoring endpoints")
public class AdminPortalController {

    private final AdminService adminService;

    @GetMapping("/overview")
    @Operation(summary = "Get platform overview KPIs, system health, and top target domains")
    public ResponseEntity<AdminOverviewDto> getOverview() {
        return ResponseEntity.ok(adminService.getOverviewStats());
    }

    @GetMapping("/links")
    @Operation(summary = "Browse and search all links across the instance")
    public ResponseEntity<Page<AdminLinkDto>> getLinks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(adminService.getLinks(page, size, search, status));
    }

    @PostMapping("/links/{hash}/quarantine")
    @Operation(summary = "Quarantine/disable a short link with a reason")
    public ResponseEntity<AdminLinkDto> quarantineLink(
            @PathVariable String hash,
            @Valid @RequestBody QuarantineRequestDto request
    ) {
        return ResponseEntity.ok(adminService.quarantineLink(hash, request.getReason()));
    }

    @PostMapping("/links/{hash}/unquarantine")
    @Operation(summary = "Restore a quarantined short link")
    public ResponseEntity<AdminLinkDto> unquarantineLink(@PathVariable String hash) {
        return ResponseEntity.ok(adminService.unquarantineLink(hash));
    }

    @DeleteMapping("/links/{hash}")
    @Operation(summary = "Hard-delete a short link by admin")
    public ResponseEntity<Map<String, String>> deleteLink(@PathVariable String hash) {
        adminService.deleteLink(hash);
        return ResponseEntity.ok(Map.of("message", "Link deleted successfully"));
    }

    @GetMapping("/users")
    @Operation(summary = "Browse and search registered users")
    public ResponseEntity<Page<AdminUserDto>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(adminService.getUsers(page, size, search));
    }

    @PostMapping("/users/{publicId}/suspend")
    @Operation(summary = "Toggle user suspension status and revoke active tokens")
    public ResponseEntity<AdminUserDto> toggleSuspend(
            @PathVariable String publicId,
            @RequestBody(required = false) SuspendRequestDto request
    ) {
        Long currentUserId = getCurrentUserId();
        String reason = request != null ? request.getReason() : null;
        return ResponseEntity.ok(adminService.toggleUserSuspension(publicId, reason, currentUserId));
    }

    @PutMapping("/users/{publicId}/role")
    @Operation(summary = "Update user role (ROOT only)")
    public ResponseEntity<AdminUserDto> updateUserRole(
            @PathVariable String publicId,
            @Valid @RequestBody RoleUpdateRequestDto request
    ) {
        Long currentUserId = getCurrentUserId();
        return ResponseEntity.ok(adminService.updateUserRole(publicId, request.getRole(), currentUserId));
    }

    @GetMapping("/blacklist")
    @Operation(summary = "List all blacklisted domain patterns")
    public ResponseEntity<List<BlacklistedDomain>> getBlacklist() {
        return ResponseEntity.ok(adminService.getBlacklist());
    }

    @PostMapping("/blacklist")
    @Operation(summary = "Add a domain to the blacklist")
    public ResponseEntity<BlacklistedDomain> addBlacklist(@Valid @RequestBody BlacklistRequestDto request) {
        return ResponseEntity.ok(adminService.addBlacklistDomain(request.getDomainPattern(), request.getReason()));
    }

    @DeleteMapping("/blacklist/{id}")
    @Operation(summary = "Remove a domain from the blacklist")
    public ResponseEntity<Map<String, String>> deleteBlacklist(@PathVariable Long id) {
        adminService.deleteBlacklistDomain(id);
        return ResponseEntity.ok(Map.of("message", "Blacklisted domain removed"));
    }

    @GetMapping("/settings")
    @Operation(summary = "Get live runtime system settings (ROOT only)")
    public ResponseEntity<List<SystemSettingDto>> getSettings() {
        return ResponseEntity.ok(adminService.getSystemSettings());
    }

    @PutMapping("/settings/{key}")
    @Operation(summary = "Update a live system setting (ROOT only)")
    public ResponseEntity<SystemSettingDto> updateSetting(
            @PathVariable String key,
            @RequestBody SystemSettingDto request
    ) {
        return ResponseEntity.ok(adminService.updateSystemSetting(
                key,
                request.getSettingValue(),
                request.getDescription()
        ));
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Long) {
            return (Long) auth.getPrincipal();
        }
        return null;
    }
}
