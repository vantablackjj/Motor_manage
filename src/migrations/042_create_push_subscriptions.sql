-- Migration 042: Create push_subscriptions table
-- Lưu trữ Web Push subscriptions của từng thiết bị/trình duyệt người dùng

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES sys_user(id) ON DELETE CASCADE,
  -- endpoint là địa chỉ Push Service của trình duyệt (Chrome, Firefox,...)
  endpoint      TEXT NOT NULL,
  -- p256dh và auth là key dùng để mã hóa payload gửi đến thiết bị
  p256dh        TEXT NOT NULL,
  auth          TEXT NOT NULL,
  -- Hệ điều hành / trình duyệt để debug
  user_agent    TEXT,
  -- Cho phép disable subscription mà không xóa
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Mỗi endpoint là unique (1 thiết bị chỉ có 1 subscription)
  CONSTRAINT uq_push_endpoint UNIQUE (endpoint)
);

-- Index để truy vấn nhanh subscription theo user
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON push_subscriptions (user_id)
  WHERE is_active = TRUE;

COMMENT ON TABLE push_subscriptions IS 'Lưu Web Push subscriptions của người dùng';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'URL endpoint của Push Service trình duyệt';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'ECDH public key của client (base64url)';
COMMENT ON COLUMN push_subscriptions.auth IS 'Authentication secret (base64url)';
