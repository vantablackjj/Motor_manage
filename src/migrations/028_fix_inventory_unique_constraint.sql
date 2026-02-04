-- =====================================================
-- MIGRATION 028: FIX INVENTORY UNIQUE CONSTRAINT
-- Description: Khôi phục ràng buộc UNIQUE cho bảng tồn kho 
-- để hỗ trợ lệnh ON CONFLICT.
-- =====================================================

DO $$
BEGIN
    -- 1. Xóa dữ liệu trùng lặp nếu có (giữ lại 1 bản ghi mới nhất cho mỗi cặp mã hàng + mã kho)
    DELETE FROM tm_hang_hoa_ton_kho a
    USING tm_hang_hoa_ton_kho b
    WHERE a.id < b.id 
      AND a.ma_hang_hoa = b.ma_hang_hoa 
      AND a.ma_kho = b.ma_kho;

    -- 2. Thêm lại ràng buộc UNIQUE nếu chưa tồn tại
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'tm_hang_hoa_ton_kho' 
                   AND constraint_type = 'UNIQUE'
                   AND constraint_name = 'tm_hang_hoa_ton_kho_ma_hang_hoa_ma_kho_key') THEN
        ALTER TABLE tm_hang_hoa_ton_kho ADD CONSTRAINT tm_hang_hoa_ton_kho_ma_hang_hoa_ma_kho_key UNIQUE(ma_hang_hoa, ma_kho);
    END IF;

    RAISE NOTICE 'Migration 028: Unique constraint for inventory fixed';
END $$;
