package com.url_shortener.url_shortener.urls;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class LinkCheckServiceTest {

    private LinkCheckService linkCheckService;

    @BeforeEach
    void setUp() {
        linkCheckService = new LinkCheckService();
    }

    @Test
    void checkSingle_EmptyUrl_ReturnsAbnormal() {
        LinkCheckResultDto result = linkCheckService.checkSingle("1", "test", "", 5);
        assertNotNull(result);
        assertEquals("ABNORMAL", result.getStatus());
        assertEquals(400, result.getStatusCode());
        assertEquals("URL is empty", result.getError());
    }

    @Test
    void checkBatch_EmptyList_ReturnsEmptyBatch() {
        LinkCheckBatchRequestDto request = new LinkCheckBatchRequestDto(List.of(), 5);
        LinkCheckBatchResponseDto response = linkCheckService.checkBatch(request);
        assertNotNull(response);
        assertEquals(0, response.getTotal());
        assertEquals(0, response.getNormal());
        assertEquals(0, response.getAbnormal());
    }
}
