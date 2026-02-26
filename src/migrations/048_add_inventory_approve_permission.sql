-- =====================================================
-- MIGRATION 048: ADD INVENTORY APPROVE PERMISSION
-- Description: Grant inventory.approve to QUAN_LY and KE_TOAN roles
-- Author: Antigravity
-- Date: 2026-02-27
-- =====================================================

-- Thêm quyền inventory.approve cho role QUAN_LY
UPDATE sys_role
SET permissions = jsonb_set(
  permissions,
  '{inventory, approve}',
  'true'::jsonb
)
WHERE ma_quyen = 'QUAN_LY';

-- Thêm quyền inventory.approve cho role KE_TOAN
UPDATE sys_role
SET permissions = jsonb_set(
  permissions,
  '{inventory, approve}',
  'true'::jsonb
)
WHERE ma_quyen = 'KE_TOAN';

-- Kiểm tra lại kết quả
SELECT ma_quyen, permissions->'inventory' AS inventory_perms
FROM sys_role
WHERE ma_quyen IN ('QUAN_LY', 'KE_TOAN', 'ADMIN');

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 048: inventory.approve permission added to QUAN_LY and KE_TOAN';
END $$;
