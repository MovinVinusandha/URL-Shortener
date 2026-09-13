package com.url_shortener.url_shortener.urls;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/links/check")
@RequiredArgsConstructor
@Tag(name = "Link Check", description = "Endpoints for checking destination link status and reachability")
public class LinkCheckController {

    private final LinkCheckService linkCheckService;

    @PostMapping
    @Operation(summary = "Check batch of URLs for reachability and response code")
    public ResponseEntity<LinkCheckBatchResponseDto> checkBatch(@Valid @RequestBody LinkCheckBatchRequestDto request) {
        var response = linkCheckService.checkBatch(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/single")
    @Operation(summary = "Check reachability of a single URL")
    public ResponseEntity<LinkCheckResultDto> checkSingle(@Valid @RequestBody LinkCheckItemRequest request) {
        var response = linkCheckService.checkSingle(request.getId(), request.getSlug(), request.getUrl(), 8);
        return ResponseEntity.ok(response);
    }
}
