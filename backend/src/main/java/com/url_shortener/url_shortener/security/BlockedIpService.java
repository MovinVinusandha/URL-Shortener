package com.url_shortener.url_shortener.security;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.web.util.matcher.IpAddressMatcher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
@RequiredArgsConstructor
public class BlockedIpService {

    private final BlockedIpRepository blockedIpRepository;
    private final List<IpAddressMatcher> cachedMatchers = new CopyOnWriteArrayList<>();

    @PostConstruct
    public void init() {
        reloadMatchers();
    }

    public synchronized void reloadMatchers() {
        try {
            List<BlockedIp> allBlocked = blockedIpRepository.findAll();
            List<IpAddressMatcher> newMatchers = allBlocked.stream()
                    .map(b -> {
                        try {
                            return new IpAddressMatcher(b.getIpAddress().trim());
                        } catch (Exception e) {
                            log.warn("Invalid IP address or CIDR format in database (id={}): {}", b.getId(), b.getIpAddress());
                            return null;
                        }
                    })
                    .filter(java.util.Objects::nonNull)
                    .toList();

            cachedMatchers.clear();
            cachedMatchers.addAll(newMatchers);
            log.info("Loaded {} IP blacklist matchers into memory", cachedMatchers.size());
        } catch (Exception e) {
            log.error("Failed to load blocked IP matchers: {}", e.getMessage());
        }
    }

    /**
     * High-speed in-memory check whether a client IP matches any blocked IP or CIDR block.
     */
    public boolean isIpBlocked(String clientIp) {
        if (clientIp == null || clientIp.isBlank()) {
            return false;
        }
        for (IpAddressMatcher matcher : cachedMatchers) {
            if (matcher.matches(clientIp)) {
                return true;
            }
        }
        return false;
    }

    public Page<BlockedIp> getBlockedIps(Pageable pageable) {
        return blockedIpRepository.findAll(pageable);
    }

    public List<BlockedIp> getAllBlockedIps() {
        return blockedIpRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    @Transactional
    public BlockedIp blockIp(String ipAddress, String reason, String createdBy) {
        if (ipAddress == null || ipAddress.trim().isBlank()) {
            throw new IllegalArgumentException("IP address cannot be blank");
        }
        String cleanIp = ipAddress.trim();

        // Validate format by instantiating IpAddressMatcher
        try {
            new IpAddressMatcher(cleanIp);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid IP address or CIDR format: " + cleanIp);
        }

        if (blockedIpRepository.existsByIpAddress(cleanIp)) {
            throw new IllegalArgumentException("IP or CIDR is already blocked: " + cleanIp);
        }

        BlockedIp blockedIp = BlockedIp.builder()
                .ipAddress(cleanIp)
                .reason(reason != null ? reason.trim() : "Blocked by administrator")
                .createdBy(createdBy != null ? createdBy : "ADMIN")
                .build();

        BlockedIp saved = blockedIpRepository.save(blockedIp);
        reloadMatchers();
        return saved;
    }

    @Transactional
    public void unblockIp(Long id) {
        blockedIpRepository.deleteById(id);
        reloadMatchers();
    }
}
