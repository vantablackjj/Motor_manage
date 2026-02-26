-- =====================================================
-- MIGRATION 047: UPDATE MAINTENANCE APPROVAL FLOW
-- Description: Add approval fields and update status defaults
-- Author: Antigravity
-- Date: 2026-02-27
-- =====================================================

-- 1. Update status column to include CHO_DUYET and make it default
-- Statuses: CHO_DUYET (Draft/Pending), DA_DUYET (Approved/Finished), DA_HUY (Cancelled)
ALTER TABLE tm_bao_tri ALTER COLUMN trang_thai SET DEFAULT 'CHO_DUYET';

-- 2. Add approval tracking columns
ALTER TABLE tm_bao_tri ADD COLUMN IF NOT EXISTS nguoi_duyet VARCHAR(100);
ALTER TABLE tm_bao_tri ADD COLUMN IF NOT EXISTS ngay_duyet TIMESTAMP;
ALTER TABLE tm_bao_tri ADD COLUMN IF NOT EXISTS ma_kho VARCHAR(50) REFERENCES dm_kho(ma_kho);

-- 3. Update existing records if any
UPDATE tm_bao_tri SET trang_thai = 'DA_DUYET' WHERE trang_thai = 'HOAN_THANH';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 047: Maintenance approval fields added';
END $$;
