-- =====================================================
-- MIGRATION: ENSURE ALL ROLES EXIST
-- Description: Make sure all required roles exist in sys_role
-- Author: Antigravity
-- Date: 2026-02-11
-- =====================================================

-- Check if ma_quyen column exists and insert accordingly
DO $$
DECLARE
    has_ma_quyen BOOLEAN;
BEGIN
    -- Check if ma_quyen column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sys_role' 
        AND column_name = 'ma_quyen'
    ) INTO has_ma_quyen;

    IF has_ma_quyen THEN
        -- Insert with ma_quyen column
        INSERT INTO sys_role (ma_quyen, ten_quyen, mo_ta, status)
        VALUES 
            ('ADMIN', 'ADMIN', 'Quản trị viên', TRUE),
            ('QUAN_LY_CTY', 'QUAN_LY_CTY', 'Quản lý công ty', TRUE),
            ('QUAN_LY_CHI_NHANH', 'QUAN_LY_CHI_NHANH', 'Quản lý chi nhánh', TRUE),
            ('NHAN_VIEN', 'NHAN_VIEN', 'Nhân viên', TRUE),
            ('KHO', 'KHO', 'Nhân viên kho', TRUE)
        ON CONFLICT (ten_quyen) DO UPDATE 
        SET mo_ta = EXCLUDED.mo_ta, ma_quyen = EXCLUDED.ma_quyen;
    ELSE
        -- Insert without ma_quyen column
        INSERT INTO sys_role (ten_quyen, mo_ta, status)
        VALUES 
            ('ADMIN', 'Quản trị viên', TRUE),
            ('QUAN_LY_CTY', 'Quản lý công ty', TRUE),
            ('QUAN_LY_CHI_NHANH', 'Quản lý chi nhánh', TRUE),
            ('NHAN_VIEN', 'Nhân viên', TRUE),
            ('KHO', 'Nhân viên kho', TRUE)
        ON CONFLICT (ten_quyen) DO UPDATE 
        SET mo_ta = EXCLUDED.mo_ta;
    END IF;
END $$;

-- Update users with NULL role_id to NHAN_VIEN (except admin)
UPDATE sys_user 
SET role_id = (SELECT id FROM sys_role WHERE ten_quyen = 'NHAN_VIEN')
WHERE role_id IS NULL 
  AND username != 'admin';

-- Update admin user to ADMIN role if not set
UPDATE sys_user 
SET role_id = (SELECT id FROM sys_role WHERE ten_quyen = 'ADMIN')
WHERE username = 'admin' 
  AND role_id IS NULL;
