-- =====================================================
-- MIGRATION 006: DATA MIGRATION FROM OLD SCHEMA
-- Description: Migrate existing data to new schema
-- Author: Backend Upgrade
-- Date: 2026-01-20
-- WARNING: Review carefully before running!
-- =====================================================

-- 1. MIGRATE KHÁCH HÀNG → DM_DOI_TAC
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tm_khach_hang') THEN
        INSERT INTO dm_doi_tac (
            ma_doi_tac, ten_doi_tac, loai_doi_tac, ma_so_thue,
            dia_chi, dien_thoai, email, so_cmnd, ngay_sinh, ho_khau,
            dai_dien, tai_khoan, ngan_hang, status, ghi_chu, ngay_tao
        )
        SELECT 
            ma_kh, ho_ten,
            CASE WHEN la_ncc = TRUE THEN 'NHA_CUNG_CAP'::enum_loai_doi_tac ELSE 'KHACH_HANG'::enum_loai_doi_tac END,
            ma_so_thue, dia_chi, dien_thoai, email, so_cmnd, ngay_sinh, ho_khau,
            dai_dien, tai_khoan, ngan_hang, status, ghi_chu, ngay_tao
        FROM tm_khach_hang
        WHERE NOT EXISTS (SELECT 1 FROM dm_doi_tac WHERE dm_doi_tac.ma_doi_tac = tm_khach_hang.ma_kh);
    END IF;
END $$;

-- 2. MIGRATE SYS_KHO → SYS_KHO_NEW (Optional check)
-- Skipped as sys_kho is now handled in bootstrap

-- 3. CREATE DEFAULT PRODUCT GROUPS
INSERT INTO dm_nhom_hang (ma_nhom, ten_nhom, ma_nhom_cha, status)
VALUES 
    ('XE', 'Xe máy', NULL, TRUE),
    ('PT', 'Phụ tùng', NULL, TRUE),
    ('LAPTOP', 'Laptop', NULL, TRUE),
    ('DIEN_THOAI', 'Điện thoại', NULL, TRUE)
ON CONFLICT (ma_nhom) DO NOTHING;

-- 4. MIGRATE PHỤ TÙNG → TM_HANG_HOA (BATCH)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tm_phu_tung') THEN
        INSERT INTO tm_hang_hoa (
            ma_hang_hoa, ten_hang_hoa, ma_nhom_hang, loai_quan_ly,
            gia_ban_mac_dinh, gia_von_mac_dinh, don_vi_tinh,
            status, ngay_tao
        )
        SELECT 
            ma_pt, ten_pt, 'PT', 'BATCH'::enum_loai_quan_ly,
            gia_ban, gia_nhap, don_vi_tinh, status, ngay_tao
        FROM tm_phu_tung
        WHERE NOT EXISTS (SELECT 1 FROM tm_hang_hoa WHERE tm_hang_hoa.ma_hang_hoa = tm_phu_tung.ma_pt);
    END IF;
END $$;

-- 5. MIGRATE TỒN KHO PHỤ TÙNG → TM_HANG_HOA_TON_KHO
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tm_phu_tung_ton_kho') 
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tm_phu_tung') THEN
        INSERT INTO tm_hang_hoa_ton_kho (
            ma_hang_hoa, ma_kho, so_luong_ton, so_luong_khoa,
            so_luong_toi_thieu, gia_von_binh_quan, cap_nhat_cuoi
        )
        SELECT 
            tk.ma_pt, tk.ma_kho, tk.so_luong_ton, tk.so_luong_khoa,
            tk.so_luong_toi_thieu, pt.gia_nhap, tk.ngay_cap_nhat
        FROM tm_phu_tung_ton_kho tk
        INNER JOIN tm_phu_tung pt ON tk.ma_pt = pt.ma_pt
        WHERE NOT EXISTS (
            SELECT 1 FROM tm_hang_hoa_ton_kho 
            WHERE tm_hang_hoa_ton_kho.ma_hang_hoa = tk.ma_pt 
            AND tm_hang_hoa_ton_kho.ma_kho = tk.ma_kho
        );
    END IF;
END $$;

-- 6. MIGRATE XE → TM_HANG_HOA (SERIAL)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tm_xe_thuc_te')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dm_loai_xe') THEN
        -- Product catalog
        INSERT INTO tm_hang_hoa (
            ma_hang_hoa, ten_hang_hoa, ma_nhom_hang, loai_quan_ly,
            gia_ban_mac_dinh, gia_von_mac_dinh, don_vi_tinh,
            thong_so_ky_thuat, status, ngay_tao
        )
        SELECT DISTINCT
            x.ma_loai_xe, lx.ten_loai_xe, 'XE', 'SERIAL'::enum_loai_quan_ly,
            lx.gia_ban, lx.gia_nhap, 'Chiếc',
            jsonb_build_object('ma_loai_xe', x.ma_loai_xe, 'phan_khoi', lx.phan_khoi),
            TRUE, NOW()
        FROM tm_xe_thuc_te x
        INNER JOIN dm_loai_xe lx ON x.ma_loai_xe = lx.ma_loai_xe
        WHERE NOT EXISTS (SELECT 1 FROM tm_hang_hoa WHERE tm_hang_hoa.ma_hang_hoa = x.ma_loai_xe);

        -- Serials
        INSERT INTO tm_hang_hoa_serial (
            ma_serial, ma_hang_hoa, serial_identifier, ma_kho_hien_tai,
            trang_thai, locked, locked_reason, locked_at, gia_von,
            thuoc_tinh_rieng, ngay_nhap_kho, ghi_chu
        )
        SELECT 
            x.xe_key, x.ma_loai_xe, x.so_khung, x.ma_kho_hien_tai,
            COALESCE(x.trang_thai, 'TON_KHO')::enum_trang_thai_serial,
            x.locked, x.locked_reason, x.locked_at, x.gia_nhap,
            jsonb_build_object('so_may', x.so_may, 'ma_mau', x.ma_mau, 'bien_so', x.bien_so),
            x.ngay_nhap_kho, x.ghi_chu
        FROM tm_xe_thuc_te x
        WHERE NOT EXISTS (SELECT 1 FROM tm_hang_hoa_serial WHERE tm_hang_hoa_serial.ma_serial = x.xe_key);
    END IF;
END $$;

-- 7. CREATE DEFAULT ROLES
INSERT INTO sys_role (ten_quyen, mo_ta, permissions, status)
VALUES 
    ('ADMIN', 'Quản trị viên', '{"view_gia_von": true, "edit_don_hang": true, "duyet_phieu": true, "view_reports": true}'::jsonb, TRUE),
    ('KHO', 'Nhân viên kho', '{"view_gia_von": false, "edit_don_hang": false, "duyet_phieu": false, "view_reports": false}'::jsonb, TRUE),
    ('KE_TOAN', 'Kế toán', '{"view_gia_von": true, "edit_don_hang": false, "duyet_phieu": true, "view_reports": true}'::jsonb, TRUE),
    ('SALE', 'Nhân viên bán hàng', '{"view_gia_von": false, "edit_don_hang": true, "duyet_phieu": false, "view_reports": false}'::jsonb, TRUE)
ON CONFLICT (ten_quyen) DO NOTHING;

-- Assign default role to existing users
UPDATE sys_user 
SET role_id = (SELECT id FROM sys_role WHERE ten_quyen = 'ADMIN' LIMIT 1)
WHERE role_id IS NULL;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 006: Data migration process finished';
END $$;
