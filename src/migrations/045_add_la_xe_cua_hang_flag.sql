-- =====================================================
-- MIGRATION 045: ADD la_xe_cua_hang FLAG
-- Description: Distinguish vehicles sold by this shop vs external vehicles
-- Author: Antigravity
-- Date: 2026-02-26
-- =====================================================

-- la_xe_cua_hang: TRUE = xe mình nhập về và đã bán ra
--                 FALSE = xe khách mang từ nơi khác tới sửa
ALTER TABLE tm_hang_hoa_serial 
  ADD COLUMN IF NOT EXISTS la_xe_cua_hang BOOLEAN DEFAULT FALSE;

-- Update existing vehicles that have been sold by this shop
UPDATE tm_hang_hoa_serial
  SET la_xe_cua_hang = TRUE
  WHERE so_hoa_don_ban IS NOT NULL;

-- Vehicles currently in stock that were imported through the system
UPDATE tm_hang_hoa_serial
  SET la_xe_cua_hang = TRUE
  WHERE trang_thai IN ('TON_KHO', 'DA_BAN', 'DANG_CHUYEN')
    AND la_xe_cua_hang = FALSE
    AND EXISTS (
      SELECT 1 FROM tm_hang_hoa_lich_su ls
      WHERE ls.ma_serial = tm_hang_hoa_serial.ma_serial
        AND ls.loai_giao_dich = 'NHAP_KHO'
    );

-- Add status for external vehicles (if not yet in the enum)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'XE_NGOAI' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_trang_thai_serial')
  ) THEN
    ALTER TYPE enum_trang_thai_serial ADD VALUE IF NOT EXISTS 'XE_NGOAI';
  END IF;
END $$;

-- Index for quick filtering
CREATE INDEX IF NOT EXISTS idx_tm_serial_la_xe_cua_hang 
  ON tm_hang_hoa_serial(la_xe_cua_hang);

DO $$
BEGIN
    RAISE NOTICE 'Migration 045: la_xe_cua_hang flag added successfully';
END $$;
