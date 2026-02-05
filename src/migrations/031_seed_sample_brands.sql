-- Seed sample brand data for testing
-- This script adds sample brands for both XE and PT categories

-- Ensure parent groups exist first
INSERT INTO dm_nhom_hang (ma_nhom, ten_nhom, ma_nhom_cha, status, created_at, updated_at)
VALUES 
  ('XE', 'Xe máy', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('PT', 'Phụ tùng', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (ma_nhom) DO UPDATE 
SET 
  ten_nhom = EXCLUDED.ten_nhom,
  status = EXCLUDED.status,
  updated_at = CURRENT_TIMESTAMP;

-- Insert sample vehicle brands (XE)
INSERT INTO dm_nhom_hang (ma_nhom, ten_nhom, ma_nhom_cha, status, created_at, updated_at)
VALUES 
  ('HONDA', 'Honda', 'XE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('YAMAHA', 'Yamaha', 'XE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('SUZUKI', 'Suzuki', 'XE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('SYM', 'SYM', 'XE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (ma_nhom) DO UPDATE 
SET 
  ten_nhom = EXCLUDED.ten_nhom,
  ma_nhom_cha = EXCLUDED.ma_nhom_cha,
  status = EXCLUDED.status,
  updated_at = CURRENT_TIMESTAMP;

-- Insert sample part categories (PT)
INSERT INTO dm_nhom_hang (ma_nhom, ten_nhom, ma_nhom_cha, status, created_at, updated_at)
VALUES 
  ('Phanh', 'Hệ thống Phanh', 'PT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('LOP', 'Lốp', 'PT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('DEN', 'Đèn', 'PT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('GUONG', 'Gương', 'PT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (ma_nhom) DO UPDATE 
SET 
  ten_nhom = EXCLUDED.ten_nhom,
  ma_nhom_cha = EXCLUDED.ma_nhom_cha,
  status = EXCLUDED.status,
  updated_at = CURRENT_TIMESTAMP;

-- Verify the data
SELECT 
  ma_nhom_cha as "Nhóm cha",
  COUNT(*) as "Số lượng",
  STRING_AGG(ma_nhom, ', ' ORDER BY ma_nhom) as "Danh sách mã"
FROM dm_nhom_hang 
WHERE ma_nhom_cha IS NOT NULL
GROUP BY ma_nhom_cha
ORDER BY ma_nhom_cha;

-- Show all brands
SELECT 
  ma_nhom,
  ten_nhom,
  ma_nhom_cha,
  status,
  created_at
FROM dm_nhom_hang
ORDER BY 
  CASE WHEN ma_nhom_cha IS NULL THEN 0 ELSE 1 END,
  ma_nhom_cha,
  ma_nhom;
