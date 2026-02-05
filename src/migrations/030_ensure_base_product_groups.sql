-- Migration: Ensure base product groups exist
-- This ensures XE and PT parent groups exist in dm_nhom_hang

-- Insert base parent groups if they don't exist
INSERT INTO dm_nhom_hang (ma_nhom, ten_nhom, ma_nhom_cha, status, created_at, updated_at)
VALUES 
  ('XE', 'Xe máy', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('PT', 'Phụ tùng', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (ma_nhom) DO UPDATE 
SET 
  ten_nhom = EXCLUDED.ten_nhom,
  status = EXCLUDED.status,
  updated_at = CURRENT_TIMESTAMP;

-- Verify the data
SELECT ma_nhom, ten_nhom, ma_nhom_cha, status 
FROM dm_nhom_hang 
WHERE ma_nhom IN ('XE', 'PT')
ORDER BY ma_nhom;
