package com.url_shortener.url_shortener.admin.audit;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditChainVerificationDto {
    private boolean valid;
    private long totalVerified;
    private String genesisHash;
    private String latestHash;
    private Long tamperedEntryId;
    private String failureReason;
    private LocalDateTime verifiedAt;
}
