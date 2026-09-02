package com.url_shortener.url_shortener.urls;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchCampaignRequestDto {
    @NotBlank(message = "Destination URL is required")
    private String longUrl;

    @NotBlank(message = "Campaign name is required")
    private String campaignName;

    @NotEmpty(message = "At least one channel must be specified")
    @Valid
    private List<BatchChannelItemDto> channels;

    private Long folderId;
    private List<Long> tagIds;
}
