package com.url_shortener.url_shortener.analytics;

import com.url_shortener.url_shortener.analytics.dto.ClickEventDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Service managing real-time Server-Sent Events (SSE) connections for user click streams.
 * Handles subscription lifecycle, heartbeat pings, and thread-safe event broadcasting.
 */
@Service
@Slf4j
public class EventStreamService {

    // Emitter timeout set to 30 minutes
    private static final Long EMITTER_TIMEOUT = 30 * 60 * 1000L;

    // Key: userId -> List of active SseEmitters for this user (multiple tabs allowed)
    private final Map<Long, List<SseEmitter>> userEmitters = new ConcurrentHashMap<>();

    /**
     * Subscribe an authenticated user to their real-time event stream.
     */
    public SseEmitter subscribe(Long userId) {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT);

        userEmitters.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(userId, emitter));
        emitter.onTimeout(() -> removeEmitter(userId, emitter));
        emitter.onError(e -> removeEmitter(userId, emitter));

        // Send initial connection handshake event
        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data("Connected to real-time events stream"));
        } catch (IOException e) {
            removeEmitter(userId, emitter);
        }

        return emitter;
    }

    /**
     * Broadcast an incoming click event to all active emitters registered to the link owner.
     */
    public void broadcastEvent(Long userId, ClickEventDto eventDto) {
        List<SseEmitter> emitters = userEmitters.get(userId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("click-event")
                        .data(eventDto));
            } catch (Exception e) {
                log.debug("Removing failed emitter for userId={}: {}", userId, e.getMessage());
                removeEmitter(userId, emitter);
            }
        }
    }

    /**
     * Heartbeat every 25 seconds to keep SSE connections alive through reverse proxies (e.g. Nginx, ALB).
     */
    @Scheduled(fixedRate = 25000)
    public void sendHeartbeat() {
        userEmitters.forEach((userId, emitters) -> {
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event()
                            .name("ping")
                            .data("heartbeat"));
                } catch (Exception e) {
                    removeEmitter(userId, emitter);
                }
            }
        });
    }

    private void removeEmitter(Long userId, SseEmitter emitter) {
        List<SseEmitter> list = userEmitters.get(userId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                userEmitters.remove(userId);
            }
        }
    }
}
