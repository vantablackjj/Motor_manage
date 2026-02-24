-- =====================================================
-- MIGRATION 038: CREATE SYS_USER_KHO
-- Description: Tạo bảng phân quyền người dùng theo kho
-- Author: Backend Fix
-- Date: 2026-02-24
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sys_user_kho') THEN
        CREATE TABLE sys_user_kho (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES sys_user(id),
            ma_kho VARCHAR(50) NOT NULL REFERENCES sys_kho(ma_kho),
            quyen_xem BOOLEAN DEFAULT TRUE,
            quyen_them BOOLEAN DEFAULT FALSE,
            quyen_sua BOOLEAN DEFAULT FALSE,
            quyen_xoa BOOLEAN DEFAULT FALSE,
            quyen_chuyen_kho BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, ma_kho)
        );

        CREATE INDEX idx_sys_user_kho_user ON sys_user_kho(user_id);
        CREATE INDEX idx_sys_user_kho_kho ON sys_user_kho(ma_kho);

        RAISE NOTICE 'Table sys_user_kho created successfully';
    ELSE
        RAISE NOTICE 'Table sys_user_kho already exists';
    END IF;
END $$;
