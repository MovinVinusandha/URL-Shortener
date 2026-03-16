CREATE TABLE tags (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(255),
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tags_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE url_tags (
    url_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    PRIMARY KEY (url_id, tag_id),
    CONSTRAINT fk_url_tags_url FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE,
    CONSTRAINT fk_url_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
