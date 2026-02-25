-- Migration 040: Tạo bảng lưu refresh tokens để hỗ trợ revoke khi logout
-- Không có bảng này, người dùng sau khi logout vẫn dùng refresh token cũ được

CREATE TABLE IF NOT EXISTS sys_refresh_token (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES sys_user(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,  -- Lưu hash của token, không lưu plain text
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  revoked_at  TIMESTAMPTZ DEFAULT NULL,      -- NULL = còn hiệu lực, có giá trị = đã revoke
  user_agent  TEXT DEFAULT NULL,
  ip_address  VARCHAR(50) DEFAULT NULL
);

-- Index để tìm kiếm nhanh theo token_hash và user_id
CREATE INDEX IF NOT EXISTS idx_refresh_token_hash   ON sys_refresh_token(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_token_user   ON sys_refresh_token(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_token_expiry ON sys_refresh_token(expires_at);

-- Tự dọn dẹp token đã hết hạn (chạy thủ công hoặc qua cron)
-- DELETE FROM sys_refresh_token WHERE expires_at < NOW();

COMMENT ON TABLE sys_refresh_token IS 'Lưu refresh tokens để hỗ trợ logout thực sự (token revocation)';
