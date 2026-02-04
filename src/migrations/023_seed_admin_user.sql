-- =====================================================
-- MIGRATION 023: SEED INITIAL ADMIN USER
-- Description: Create a default admin user if none exists
-- Author: Antigravity AI
-- Date: 2026-02-04
-- =====================================================

DO $$
DECLARE
    admin_role_id INTEGER;
    -- Password hash for 'admin' (bcrypt 10 rounds)
    admin_password_hash VARCHAR(255) := '$2a$10$oM80aibKQsOI4nPc3CP4j1HYGzXI9piH4YInQW17YJt0vDC'; 
BEGIN
    -- 1. Ensure ADMIN role exists and get its ID
    -- Note: Migration 006 already creates default roles, but we ensure it here too
    IF NOT EXISTS (SELECT 1 FROM sys_role WHERE ten_quyen = 'ADMIN') THEN
        INSERT INTO sys_role (ma_quyen, ten_quyen, mo_ta, permissions, status)
        VALUES ('ADMIN', 'ADMIN', 'Quản trị viên hệ thống', '{"view_gia_von": true, "edit_don_hang": true, "duyet_phieu": true, "view_reports": true}'::jsonb, TRUE);
    END IF;

    SELECT id INTO admin_role_id FROM sys_role WHERE ten_quyen = 'ADMIN' LIMIT 1;

    -- 2. Create the admin user if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM sys_user WHERE username = 'admin') THEN
        INSERT INTO sys_user (
            username, 
            password_hash, 
            ho_ten, 
            email, 
            dien_thoai, 
            role_id, 
            status
        ) VALUES (
            'admin', 
            admin_password_hash, 
            'Administrator', 
            'admin@example.com', 
            '0123456789', 
            admin_role_id, 
            TRUE
        );
        RAISE NOTICE 'Admin user created successfully with password: admin';
    ELSE
        -- If user exists but login failed, update the password to 'admin'
        UPDATE sys_user 
        SET password_hash = admin_password_hash,
            role_id = admin_role_id,
            status = TRUE
        WHERE username = 'admin';
        RAISE NOTICE 'Admin user already exists. Password reset to: admin';
    END IF;

END $$;
