-- =====================================================
-- MIGRATION: ADD VEHICLE APPROVAL INDEX
-- Description: Create index for vehicle approval status
-- Author: Antigravity
-- Date: 2026-02-11
-- =====================================================

-- This is separated from 032 because PostgreSQL does not allow
-- using new enum values in the same transaction they were created in.

CREATE INDEX IF NOT EXISTS idx_tm_hang_hoa_serial_approval 
  ON tm_hang_hoa_serial(trang_thai) 
  WHERE trang_thai IN ('NHAP', 'CHO_DUYET');
