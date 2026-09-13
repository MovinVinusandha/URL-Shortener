package com.url_shortener.url_shortener.urls;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LinkCheckControllerTest {

    @Mock
    private LinkCheckService linkCheckService;

    @InjectMocks
    private LinkCheckController linkCheckController;

    @Test
    void checkBatch_Success() {
        LinkCheckBatchResponseDto mockResponse = LinkCheckBatchResponseDto.builder()
                .total(1)
                .normal(1)
                .abnormal(0)
                .networkError(0)
                .results(List.of(LinkCheckResultDto.builder()
                        .id("1")
                        .slug("abc")
                        .url("https://example.com")
                        .statusCode(200)
                        .status("NORMAL")
                        .durationMs(50L)
                        .build()))
                .build();

        when(linkCheckService.checkBatch(any())).thenReturn(mockResponse);

        LinkCheckBatchRequestDto request = LinkCheckBatchRequestDto.builder()
                .items(List.of(new LinkCheckItemRequest("1", "abc", "https://example.com")))
                .timeoutSeconds(5)
                .build();

        ResponseEntity<LinkCheckBatchResponseDto> response = linkCheckController.checkBatch(request);
        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        assertEquals(1, response.getBody().getTotal());
        assertEquals(1, response.getBody().getNormal());
    }
}
