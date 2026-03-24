-- =====================================================
-- MIGRATION: ADD MAINTENANCE PERMISSIONS TO ROLES
-- Description: Gán quyền maintenance cho các vai trò để đồng bộ với dashboard
-- =====================================================

DO $$
BEGIN
    -- Update ADMIN
    UPDATE sys_role 
    SET permissions = permissions || '{"maintenance": {"view": true, "create": true, "edit": true, "delete": true, "approve": true}}'::jsonb
    WHERE ma_quyen = 'ADMIN';

    -- Update BAN_HANG (Nhân viên nghiệp vụ)
    UPDATE sys_role 
    SET permissions = permissions || '{"maintenance": {"view": true, "create": true, "edit": true}}'::jsonb
    WHERE ma_quyen = 'BAN_HANG';

    -- Update QUAN_LY (Quản lý)
    UPDATE sys_role 
    SET permissions = permissions || '{"maintenance": {"view": true, "create": true, "edit": true, "delete": true, "approve": true}}'::jsonb
    WHERE ma_quyen = 'QUAN_LY';

    -- Update KE_TOAN (Kế toán)
    UPDATE sys_role 
    SET permissions = permissions || '{"maintenance": {"view": true, "edit": true, "approve": true}}'::jsonb
    WHERE ma_quyen = 'KE_TOAN';

    -- Update KHO (Nhân viên kho)
    UPDATE sys_role 
    SET permissions = permissions || '{"maintenance": {"view": true}}'::jsonb
    WHERE ma_quyen = 'KHO';

    RAISE NOTICE 'Maintenance permissions added to all roles';
END $$;
