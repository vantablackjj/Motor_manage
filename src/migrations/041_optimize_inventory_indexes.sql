-- Migration: Optimize Spare Parts Inventory
-- Added on: 2026-03-02

-- 1. Index for sorting products (Phu Tung) by group and name (Default Load Order)
CREATE INDEX IF NOT EXISTS idx_tm_hang_hoa_sorting 
ON tm_hang_hoa (ma_nhom_hang, ten_hang_hoa) 
WHERE loai_quan_ly = 'BATCH';

-- 2. Index for filtering products by status and type
CREATE INDEX IF NOT EXISTS idx_tm_hang_hoa_status_batch 
ON tm_hang_hoa (status) 
WHERE loai_quan_ly = 'BATCH';

-- 3. Index for inventory lookups and joins
CREATE INDEX IF NOT EXISTS idx_tm_hang_hoa_ton_kho_composite 
ON tm_hang_hoa_ton_kho (ma_kho, ma_hang_hoa);

-- 4. Index for filtering by stock levels (Warning/Out of stock)
CREATE INDEX IF NOT EXISTS idx_tm_hang_hoa_ton_kho_levels 
ON tm_hang_hoa_ton_kho (so_luong_ton, so_luong_khoa, so_luong_toi_thieu);
