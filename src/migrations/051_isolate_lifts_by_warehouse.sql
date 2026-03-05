-- =====================================================
-- MIGRATION 051: ISOLATE WORKSTATIONS BY WAREHOUSE
-- Description: Add ma_kho to dm_ban_nang to prevent data overlap between warehouses
-- Author: Antigravity
-- Date: 2026-03-05
-- =====================================================

-- 1. Thêm cột ma_kho vào bảng danh mục bàn nâng
ALTER TABLE dm_ban_nang ADD COLUMN IF NOT EXISTS ma_kho VARCHAR(50) REFERENCES sys_kho(ma_kho);

-- 2. Tạo index để tối ưu truy vấn theo kho
CREATE INDEX IF NOT EXISTS idx_dm_ban_nang_ma_kho ON dm_ban_nang(ma_kho);

-- 3. Gán các bàn nâng hiện có cho kho đầu tiên (nếu có) để tránh dữ liệu trống
DO $$
DECLARE
    v_first_kho VARCHAR(50);
BEGIN
    SELECT ma_kho INTO v_first_kho FROM sys_kho ORDER BY ma_kho LIMIT 1;
    
    IF v_first_kho IS NOT NULL THEN
        UPDATE dm_ban_nang SET ma_kho = v_first_kho WHERE ma_kho IS NULL;
    END IF;
END $$;

-- 4. Đảm bảo ràng buộc UNIQUE là sự kết hợp giữa mã bàn nâng và mã kho (nếu muốn cùng mã BN ở các kho khác nhau)
-- Tuy nhiên hiện tại ma_ban_nang đang là UNIQUE toàn cục. 
-- Nếu muốn cho phép mỗi kho có BN_01, BN_02 riêng, ta cần drop constraint cũ và tạo mới.
ALTER TABLE dm_ban_nang DROP CONSTRAINT IF EXISTS dm_ban_nang_ma_ban_nang_key CASCADE;
ALTER TABLE dm_ban_nang ADD CONSTRAINT dm_ban_nang_ma_ban_nang_ma_kho_key UNIQUE (ma_ban_nang, ma_kho);

-- Thêm log
DO $$
BEGIN
    RAISE NOTICE 'Migration 051: Isolated workstations by warehouse completed';
END $$;
