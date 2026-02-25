-- =====================================================
-- MIGRATION 041: CREATE NOTIFICATIONS TABLE
-- Description: Create tm_notifications table and related indexes
-- =====================================================

CREATE TABLE IF NOT EXISTS tm_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES sys_user(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- APPROVAL, INVENTORY, DEBT, SYSTEM
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_tm_notifications_user_id ON tm_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_tm_notifications_is_read ON tm_notifications(is_read);

DO $$
BEGIN
    RAISE NOTICE 'Migration 041: Notification table created successfully';
END $$;
