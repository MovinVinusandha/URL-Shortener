package com.url_shortener.url_shortener.urls;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchCampaignResponseDto {
    private String campaignName;
    private int totalCreated;
    private List<BatchCampaignResultItemDto> items;
}
