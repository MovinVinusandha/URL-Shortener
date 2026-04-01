ALTER TABLE users ADD COLUMN public_id VARCHAR(255);

UPDATE users SET public_id = CONCAT('user_', REPLACE(UUID(), '-', '')) WHERE public_id IS NULL;

ALTER TABLE users MODIFY COLUMN public_id VARCHAR(255) NOT NULL UNIQUE;
