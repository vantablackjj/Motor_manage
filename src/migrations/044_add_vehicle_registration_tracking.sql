-- =====================================================
-- MIGRATION 044: VEHICLE POST-SALE SERVICE TRACKING
-- Description: Track đăng ký biển số and đăng kiểm per sold vehicle
-- Author: Antigravity
-- Date: 2026-02-26
-- =====================================================

-- Add post-sale service columns to tm_hang_hoa_serial
ALTER TABLE tm_hang_hoa_serial ADD COLUMN IF NOT EXISTS so_hoa_don_ban VARCHAR(50);
ALTER TABLE tm_hang_hoa_serial ADD COLUMN IF NOT EXISTS ngay_ban DATE;

-- Đăng ký xe (Vehicle Registration)
ALTER TABLE tm_hang_hoa_serial ADD COLUMN IF NOT EXISTS dang_ky_xe BOOLEAN DEFAULT FALSE;
ALTER TABLE tm_hang_hoa_serial ADD COLUMN IF NOT EXISTS bien_so VARCHAR(20);
ALTER TABLE tm_hang_hoa_serial ADD COLUMN IF NOT EXISTS ngay_tra_dang_ky DATE;
ALTER TABLE tm_hang_hoa_serial ADD COLUMN IF NOT EXISTS nguoi_lam_dang_ky VARCHAR(100);

-- Đăng kiểm (Vehicle Inspection Certificate)
ALTER TABLE tm_hang_hoa_serial ADD COLUMN IF NOT EXISTS dang_kiem BOOLEAN DEFAULT FALSE;
ALTER TABLE tm_hang_hoa_serial ADD COLUMN IF NOT EXISTS ngay_tra_dang_kiem DATE;
ALTER TABLE tm_hang_hoa_serial ADD COLUMN IF NOT EXISTS nguoi_lam_dang_kiem VARCHAR(100);

-- General post-sale note
ALTER TABLE tm_hang_hoa_serial ADD COLUMN IF NOT EXISTS ghi_chu_dich_vu TEXT;

-- Index for quick queries on pending services
CREATE INDEX IF NOT EXISTS idx_tm_serial_dang_ky ON tm_hang_hoa_serial(dang_ky_xe) WHERE trang_thai = 'DA_BAN';
CREATE INDEX IF NOT EXISTS idx_tm_serial_dang_kiem ON tm_hang_hoa_serial(dang_kiem) WHERE trang_thai = 'DA_BAN';
CREATE INDEX IF NOT EXISTS idx_tm_serial_hd_ban ON tm_hang_hoa_serial(so_hoa_don_ban);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 044: Post-sale service tracking columns added successfully';
END $$;
