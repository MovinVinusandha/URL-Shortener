-- 1. Add username column and backfill for existing records
ALTER TABLE users ADD COLUMN username VARCHAR(50) NULL;
UPDATE users SET username = CONCAT('user_', id) WHERE username IS NULL OR username = '';
ALTER TABLE users MODIFY COLUMN username VARCHAR(50) NOT NULL;
ALTER TABLE users ADD CONSTRAINT uk_users_username UNIQUE (username);

-- 2. Add email verification columns and mark existing users verified
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN email_verified_at DATETIME NULL;
UPDATE users SET email_verified = TRUE, email_verified_at = NOW();

-- 3. Allow password to be NULL for OAuth users
ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL;

-- 4. Ensure email is unique
ALTER TABLE users ADD CONSTRAINT uk_users_email UNIQUE (email);

-- 5. Create OAuth accounts table
CREATE TABLE user_oauth_accounts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255) NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_user_oauth_accounts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uk_provider_provider_user_id UNIQUE (provider, provider_user_id),
    CONSTRAINT uk_user_provider UNIQUE (user_id, provider)
);

-- 6. Create email verification tokens table
CREATE TABLE email_verification_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_email_verification_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 7. Create password reset tokens table
CREATE TABLE password_reset_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
