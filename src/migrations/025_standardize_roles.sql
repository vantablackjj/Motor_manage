-- =====================================================
-- MIGRATION 025: STANDARDIZE ROLE NAMES
-- Description: Align ten_quyen with ROLES constants in constants.js
-- =====================================================

DO $$
BEGIN
    -- 1. Standardize ADMIN role
    UPDATE sys_role 
    SET ten_quyen = 'ADMIN',
        ma_quyen = 'ADMIN'
    WHERE ten_quyen = 'Quản trị viên' OR ma_quyen = 'ADMIN';

    -- 2. Standardize other roles (based on constants.js)
    UPDATE sys_role 
    SET ten_quyen = 'QUAN_LY_CTY',
        ma_quyen = 'QUAN_LY_CTY'
    WHERE ten_quyen = 'Quản lý công ty' OR ma_quyen = 'QUAN_LY_CTY';

    UPDATE sys_role 
    SET ten_quyen = 'QUAN_LY_CHI_NHANH',
        ma_quyen = 'QUAN_LY_CHI_NHANH'
    WHERE ten_quyen = 'Quản lý chi nhánh' OR ma_quyen = 'QUAN_LY_CHI_NHANH';

    UPDATE sys_role 
    SET ten_quyen = 'NHAN_VIEN',
        ma_quyen = 'NHAN_VIEN'
    WHERE ten_quyen = 'Nhân viên' OR ma_quyen = 'NHAN_VIEN';

    -- 3. Ensure the admin user is correctly linked
    UPDATE sys_user
    SET role_id = (SELECT id FROM sys_role WHERE ten_quyen = 'ADMIN' LIMIT 1)
    WHERE username = 'admin';

    RAISE NOTICE 'Role names standardized successfully.';
END $$;
