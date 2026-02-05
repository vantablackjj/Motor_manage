-- =====================================================
-- MIGRATION 029: ENSURE ALL UNIQUE CONSTRAINTS
-- Description: Đảm bảo đầy đủ các ràng buộc UNIQUE cần thiết
-- cho các câu lệnh ON CONFLICT trong toàn bộ hệ thống.
-- =====================================================

DO $$
BEGIN
    -- 1. tm_hang_hoa_serial (ma_serial)
    DELETE FROM tm_hang_hoa_serial a USING tm_hang_hoa_serial b WHERE a.id < b.id AND a.ma_serial = b.ma_serial;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tm_hang_hoa_serial_ma_serial_key' OR (contype='u' AND conrelid='tm_hang_hoa_serial'::regclass)) THEN
        ALTER TABLE tm_hang_hoa_serial ADD CONSTRAINT tm_hang_hoa_serial_ma_serial_key UNIQUE(ma_serial);
    END IF;

    -- 2. tm_hang_hoa_ton_kho (ma_hang_hoa, ma_kho)
    DELETE FROM tm_hang_hoa_ton_kho a USING tm_hang_hoa_ton_kho b WHERE a.id < b.id AND a.ma_hang_hoa = b.ma_hang_hoa AND a.ma_kho = b.ma_kho;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tm_hang_hoa_ton_kho_ma_hang_hoa_ma_kho_key' OR (contype='u' AND conrelid='tm_hang_hoa_ton_kho'::regclass)) THEN
        ALTER TABLE tm_hang_hoa_ton_kho ADD CONSTRAINT tm_hang_hoa_ton_kho_ma_hang_hoa_ma_kho_key UNIQUE(ma_hang_hoa, ma_kho);
    END IF;

    -- 3. tm_cong_no_doi_tac (ma_doi_tac, loai_cong_no)
    DELETE FROM tm_cong_no_doi_tac a USING tm_cong_no_doi_tac b WHERE a.id < b.id AND a.ma_doi_tac = b.ma_doi_tac AND a.loai_cong_no = b.loai_cong_no;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tm_cong_no_doi_tac_ma_doi_tac_loai_cong_no_key' OR (contype='u' AND conrelid='tm_cong_no_doi_tac'::regclass)) THEN
        ALTER TABLE tm_cong_no_doi_tac ADD CONSTRAINT tm_cong_no_doi_tac_ma_doi_tac_loai_cong_no_key UNIQUE(ma_doi_tac, loai_cong_no);
    END IF;

    -- 4. tm_cong_no_noi_bo (ma_kho_no, ma_kho_co)
    DELETE FROM tm_cong_no_noi_bo a USING tm_cong_no_noi_bo b WHERE a.id < b.id AND a.ma_kho_no = b.ma_kho_no AND a.ma_kho_co = b.ma_kho_co;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tm_cong_no_noi_bo_ma_kho_no_ma_kho_co_key' OR (contype='u' AND conrelid='tm_cong_no_noi_bo'::regclass)) THEN
        ALTER TABLE tm_cong_no_noi_bo ADD CONSTRAINT tm_cong_no_noi_bo_ma_kho_no_ma_kho_co_key UNIQUE(ma_kho_no, ma_kho_co);
    END IF;

    -- 5. dm_xe_mau (ma_loai_xe, ma_mau)
    DELETE FROM dm_xe_mau a USING dm_xe_mau b WHERE a.id < b.id AND a.ma_loai_xe = b.ma_loai_xe AND a.ma_mau = b.ma_mau;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dm_xe_mau_ma_loai_xe_ma_mau_key' OR (contype='u' AND conrelid='dm_xe_mau'::regclass)) THEN
        ALTER TABLE dm_xe_mau ADD CONSTRAINT dm_xe_mau_ma_loai_xe_ma_mau_key UNIQUE(ma_loai_xe, ma_mau);
    END IF;

    -- 6. sys_user_kho (user_id, ma_kho)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sys_user_kho') THEN
        DELETE FROM sys_user_kho a USING sys_user_kho b WHERE a.id < b.id AND a.user_id = b.user_id AND a.ma_kho = b.ma_kho;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sys_user_kho_user_id_ma_kho_key' OR (contype='u' AND conrelid='sys_user_kho'::regclass)) THEN
            ALTER TABLE sys_user_kho ADD CONSTRAINT sys_user_kho_user_id_ma_kho_key UNIQUE(user_id, ma_kho);
        END IF;
    END IF;

    -- 7. dm_nhom_hang (ma_nhom)
    DELETE FROM dm_nhom_hang a USING dm_nhom_hang b WHERE a.id < b.id AND a.ma_nhom = b.ma_nhom;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dm_nhom_hang_ma_nhom_key' OR (contype='u' AND conrelid='dm_nhom_hang'::regclass)) THEN
        ALTER TABLE dm_nhom_hang ADD CONSTRAINT dm_nhom_hang_ma_nhom_key UNIQUE(ma_nhom);
    END IF;

    -- 8. sys_role (ten_quyen)
    DELETE FROM sys_role a USING sys_role b WHERE a.id < b.id AND a.ten_quyen = b.ten_quyen;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sys_role_ten_quyen_key' OR (contype='u' AND conrelid='sys_role'::regclass)) THEN
        ALTER TABLE sys_role ADD CONSTRAINT sys_role_ten_quyen_key UNIQUE(ten_quyen);
    END IF;

    RAISE NOTICE 'Migration 029: All unique constraints verified and ensured';
END $$;
