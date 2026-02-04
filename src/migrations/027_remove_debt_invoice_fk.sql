-- =====================================================
-- MIGRATION 027: REMOVE DEBT INVOICE FOREIGN KEY
-- Description: Gỡ bỏ khóa ngoại để cho phép ghi nợ trước khi tạo hóa đơn 
-- hoặc ghi nợ theo số hóa đơn cung cấp bên ngoài.
-- =====================================================

DO $$
BEGIN
    -- 1. Tìm và xóa constraint khóa ngoại trên bảng tm_cong_no_doi_tac_ct
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'tm_cong_no_doi_tac_ct_so_hoa_don_fkey') THEN
        ALTER TABLE tm_cong_no_doi_tac_ct DROP CONSTRAINT tm_cong_no_doi_tac_ct_so_hoa_don_fkey;
    END IF;

    -- 2. Đảm bảo so_hoa_don là nullable
    ALTER TABLE tm_cong_no_doi_tac_ct ALTER COLUMN so_hoa_don DROP NOT NULL;

    -- 3. Làm tương tự cho bảng tm_phieu_thu_chi
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'tm_phieu_thu_chi_ma_hoa_don_fkey') THEN
        ALTER TABLE tm_phieu_thu_chi DROP CONSTRAINT tm_phieu_thu_chi_ma_hoa_don_fkey;
    END IF;

    RAISE NOTICE 'Migration 027: Foreign key constraints removed from debt tables';
END $$;
