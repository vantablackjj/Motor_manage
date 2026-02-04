-- =====================================================
-- MIGRATION: ADD DELIVERY APPROVAL WORKFLOW
-- Description: Add approval states for delivery process
-- Author: System Enhancement
-- Date: 2026-02-04
-- =====================================================

-- Step 1: Add new states to enum_trang_thai_hoa_don
ALTER TYPE enum_trang_thai_hoa_don ADD VALUE IF NOT EXISTS 'CHO_DUYET_GIAO';
ALTER TYPE enum_trang_thai_hoa_don ADD VALUE IF NOT EXISTS 'DA_DUYET_GIAO';

-- Step 2: Add approval tracking columns to tm_hoa_don
ALTER TABLE tm_hoa_don 
  ADD COLUMN IF NOT EXISTS nguoi_gui_duyet_giao INTEGER REFERENCES sys_user(id),
  ADD COLUMN IF NOT EXISTS ngay_gui_duyet_giao TIMESTAMP,
  ADD COLUMN IF NOT EXISTS nguoi_duyet_giao INTEGER REFERENCES sys_user(id),
  ADD COLUMN IF NOT EXISTS ngay_duyet_giao TIMESTAMP,
  ADD COLUMN IF NOT EXISTS ghi_chu_duyet_giao TEXT;

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_hoa_don_trang_thai_giao 
  ON tm_hoa_don(trang_thai) 
  WHERE trang_thai IN ('CHO_DUYET_GIAO', 'DA_DUYET_GIAO');

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration: Delivery approval workflow added successfully';
    RAISE NOTICE 'New states: CHO_DUYET_GIAO, DA_DUYET_GIAO';
    RAISE NOTICE 'New columns: nguoi_gui_duyet_giao, ngay_gui_duyet_giao, nguoi_duyet_giao, ngay_duyet_giao, ghi_chu_duyet_giao';
END $$;
