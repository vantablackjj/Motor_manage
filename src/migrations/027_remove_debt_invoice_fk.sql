-- =====================================================
-- MIGRATION 027: REMOVE DEBT INVOICE FOREIGN KEY (ROBUST VERSION)
-- Description: Gỡ bỏ triệt để mọi khóa ngoại liên quan đến so_hoa_don
-- =====================================================

DO $$
DECLARE
    constraint_name_var TEXT;
BEGIN
    -- 1. Tìm và xóa TẤT CẢ các khóa ngoại trỏ từ tm_cong_no_doi_tac_ct(so_hoa_don)
    FOR constraint_name_var IN 
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu 
          ON tc.constraint_name = kcu.constraint_name 
        WHERE tc.table_name = 'tm_cong_no_doi_tac_ct' 
          AND kcu.column_name = 'so_hoa_don'
          AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        EXECUTE 'ALTER TABLE tm_cong_no_doi_tac_ct DROP CONSTRAINT ' || constraint_name_var;
        RAISE NOTICE 'Dropped constraint: %', constraint_name_var;
    END LOOP;

    -- 2. Đảm bảo cột cho phép NULL
    ALTER TABLE tm_cong_no_doi_tac_ct ALTER COLUMN so_hoa_don DROP NOT NULL;

    -- 3. Làm tương tự cho bảng tm_phieu_thu_chi (cột ma_hoa_don)
    FOR constraint_name_var IN 
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu 
          ON tc.constraint_name = kcu.constraint_name 
        WHERE tc.table_name = 'tm_phieu_thu_chi' 
          AND kcu.column_name = 'ma_hoa_don'
          AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        EXECUTE 'ALTER TABLE tm_phieu_thu_chi DROP CONSTRAINT ' || constraint_name_var;
        RAISE NOTICE 'Dropped constraint from tm_phieu_thu_chi: %', constraint_name_var;
    END LOOP;

    RAISE NOTICE 'Migration 027 (Robust): All debt-invoice foreign keys removed';
END $$;
