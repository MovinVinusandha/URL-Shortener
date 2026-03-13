-- V5: Create click_events table for granular analytics
-- Each row represents one recorded click on a short URL.
-- Foreign key references urls(id) with CASCADE DELETE so events
-- are automatically purged when a URL is removed.

CREATE TABLE click_events
(
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,

    -- Reference to the shortened URL that was clicked
    url_id     BIGINT       NOT NULL,

    -- When the click occurred (stored as UTC)
    timestamp  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Device & Browser (parsed from User-Agent via YAUAA)
    device     VARCHAR(30)  NULL COMMENT 'Desktop | Mobile | Tablet | Unknown',
    browser    VARCHAR(50)  NULL COMMENT 'Chrome | Firefox | Safari | Edge | etc.',
    os         VARCHAR(50)  NULL COMMENT 'Windows | macOS | Android | iOS | Linux | etc.',

    -- Geography (resolved from IP at event time)
    country    VARCHAR(100) NULL,
    city       VARCHAR(100) NULL,
    region     VARCHAR(100) NULL,
    continent  VARCHAR(50)  NULL,

    -- Network: hashed IP (SHA-256 prefix) for analysis without storing PII
    ip_address VARCHAR(64)  NULL,

    CONSTRAINT fk_click_events_url
        FOREIGN KEY (url_id) REFERENCES urls (id)
            ON DELETE CASCADE
);

-- Index for fast per-URL analytics queries (most common access pattern)
CREATE INDEX idx_click_events_url_id
    ON click_events (url_id);

-- Index for time-range filtering (e.g., "last 24 hours")
CREATE INDEX idx_click_events_timestamp
    ON click_events (timestamp);

-- Composite index for the most common combined query: URL + time range
CREATE INDEX idx_click_events_url_id_timestamp
    ON click_events (url_id, timestamp);
