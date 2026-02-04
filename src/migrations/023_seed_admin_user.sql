-- =====================================================
-- MIGRATION 023: SEED INITIAL ADMIN USER
-- Description: Create a default admin user if none exists
-- Author: Antigravity AI
-- Date: 2026-02-04
-- =====================================================

DO $$
DECLARE
    admin_role_id INTEGER;
    -- Password hash for 'admin123456' (bcrypt 10 rounds)
    admin_password_hash VARCHAR(255) := '$2a$10$am59dKq6VVwll7P3Ia4Qv.6lS2HR.931UO7cGEkQucd4EsWQUqM6'; 
BEGIN
    -- 1. Ensure ADMIN role exists and get its ID
    -- Note: Migration 006 already creates default roles, but we ensure it here too
    IF NOT EXISTS (SELECT 1 FROM sys_role WHERE ten_quyen = 'ADMIN' OR ma_quyen = 'ADMIN') THEN
        INSERT INTO sys_role (ma_quyen, ten_quyen, mo_ta, permissions, status)
        VALUES ('ADMIN', 'ADMIN', 'Quản trị viên hệ thống', '{"view_gia_von": true, "edit_don_hang": true, "duyet_phieu": true, "view_reports": true}'::jsonb, TRUE);
    END IF;

    SELECT id INTO admin_role_id FROM sys_role WHERE ten_quyen = 'ADMIN' OR ma_quyen = 'ADMIN' LIMIT 1;

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
        RAISE NOTICE 'Admin user created successfully with password: admin123456';
    ELSE
        -- If user exists, update the password to 'admin123456'
        UPDATE sys_user 
        SET password_hash = admin_password_hash,
            role_id = admin_role_id,
            status = TRUE
        WHERE username = 'admin';
        RAISE NOTICE 'Admin user password reset to: admin123456';
    END IF;

END $$;
