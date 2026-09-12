package com.url_shortener.url_shortener.admin.maintenance;

import com.url_shortener.url_shortener.admin.maintenance.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/admin/maintenance")
@RequiredArgsConstructor
@Tag(name = "Admin Maintenance", description = "System maintenance, Redis cache operations, and data retention utilities")
public class AdminMaintenanceController {

    private final MaintenanceService maintenanceService;

    @GetMapping("/overview")
    @Operation(summary = "Get system storage, table breakdown, and Redis cache telemetry")
    public ResponseEntity<MaintenanceOverviewDto> getOverview() {
        return ResponseEntity.ok(maintenanceService.getOverview());
    }

    @PostMapping("/cache/evict-key")
    @Operation(summary = "Evict a single cache key or short URL from Redis")
    public ResponseEntity<Map<String, Object>> evictKey(@Valid @RequestBody CacheEvictKeyRequestDto request) {
        boolean evicted = maintenanceService.evictKey(request.getKey());
        return ResponseEntity.ok(Map.of(
                "key", request.getKey(),
                "evicted", evicted,
                "message", evicted ? "Cache key evicted successfully" : "Key did not exist in cache"
        ));
    }

    @PostMapping("/cache/flush-urls")
    @Operation(summary = "Evict all URL cache keys from Redis (urls::*)")
    public ResponseEntity<Map<String, Object>> flushUrlCache() {
        long count = maintenanceService.flushUrlCache();
        return ResponseEntity.ok(Map.of(
                "keysFlushed", count,
                "message", "Flushed " + count + " URL cache entries"
        ));
    }

    @PostMapping("/cache/flush-all")
    @Operation(summary = "Flush entire Redis database (ROOT only)")
    public ResponseEntity<Map<String, String>> flushAllCache() {
        maintenanceService.flushAllCache();
        return ResponseEntity.ok(Map.of("message", "Entire Redis cache flushed successfully"));
    }

    @PostMapping("/cache/warm-up")
    @Operation(summary = "Pre-populate Redis with top accessed short links")
    public ResponseEntity<Map<String, Object>> warmUpCache(@Valid @RequestBody CacheWarmUpRequestDto request) {
        int count = maintenanceService.warmUpCache(request.getTopCount());
        return ResponseEntity.ok(Map.of(
                "warmedCount", count,
                "message", "Successfully pre-warmed " + count + " URLs into Redis"
        ));
    }

    @PostMapping("/links/preview")
    @Operation(summary = "Dry-run preview candidate links for garbage collection")
    public ResponseEntity<CleanupResultDto> previewLinkCleanup(@Valid @RequestBody CleanupCriteriaDto criteria) {
        return ResponseEntity.ok(maintenanceService.previewLinkCleanup(criteria));
    }

    @PostMapping("/links/cleanup")
    @Operation(summary = "Execute garbage collection on candidate links")
    public ResponseEntity<CleanupResultDto> executeLinkCleanup(@Valid @RequestBody CleanupCriteriaDto criteria) {
        return ResponseEntity.ok(maintenanceService.executeLinkCleanup(criteria));
    }

    @PostMapping("/clicks/preview")
    @Operation(summary = "Dry-run preview click events older than threshold")
    public ResponseEntity<CleanupResultDto> previewClickPruning(@Valid @RequestBody ClickPruneRequestDto request) {
        return ResponseEntity.ok(maintenanceService.previewClickPruning(request.getDaysOlderThan()));
    }

    @PostMapping("/clicks/prune")
    @Operation(summary = "Execute click events pruning")
    public ResponseEntity<CleanupResultDto> executeClickPruning(@Valid @RequestBody ClickPruneRequestDto request) {
        if (request.isDryRun()) {
            return ResponseEntity.ok(maintenanceService.previewClickPruning(request.getDaysOlderThan()));
        }
        return ResponseEntity.ok(maintenanceService.executeClickPruning(request.getDaysOlderThan()));
    }
}
