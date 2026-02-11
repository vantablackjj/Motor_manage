-- =====================================================
-- MIGRATION: ADD VEHICLE APPROVAL WORKFLOW
-- Description: Add approval states and tracking for individual vehicle entry
-- Author: Antigravity
-- Date: 2026-02-11
-- =====================================================

-- 1. Add new states to enum_trang_thai_serial
-- Note: PostgreSQL doesn't support IF NOT EXISTS for ADD VALUE directly in some versions, 
-- but we can use a DO block or just try/catch if needed. 
-- However, for simplicity in this environment:
ALTER TYPE enum_trang_thai_serial ADD VALUE IF NOT EXISTS 'NHAP';
ALTER TYPE enum_trang_thai_serial ADD VALUE IF NOT EXISTS 'CHO_DUYET';
ALTER TYPE enum_trang_thai_serial ADD VALUE IF NOT EXISTS 'DA_TU_CHOI';

-- 2. Add approval tracking columns to tm_hang_hoa_serial
ALTER TABLE tm_hang_hoa_serial 
  ADD COLUMN IF NOT EXISTS nguoi_gui_duyet INTEGER REFERENCES sys_user(id),
  ADD COLUMN IF NOT EXISTS ngay_gui_duyet TIMESTAMP,
  ADD COLUMN IF NOT EXISTS nguoi_duyet INTEGER REFERENCES sys_user(id),
  ADD COLUMN IF NOT EXISTS ngay_duyet TIMESTAMP,
  ADD COLUMN IF NOT EXISTS ly_do_tu_choi TEXT;

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_tm_hang_hoa_serial_approval 
  ON tm_hang_hoa_serial(trang_thai) 
  WHERE trang_thai IN ('NHAP', 'CHO_DUYET');
