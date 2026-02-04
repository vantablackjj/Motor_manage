-- =====================================================
-- MIGRATION 009: MIGRATE OLD DATA TO ERP STRUCTURE
-- Description: Chuyển dữ liệu từ cấu trúc cũ sang ERP mới
-- Author: ERP Migration Team
-- Date: 2026-01-26
-- =====================================================

-- =====================================================
-- BƯỚC 1: TẠO ROOT CATEGORIES
-- =====================================================

INSERT INTO dm_nhom_hang (ma_nhom, ten_nhom, ma_nhom_cha, thong_so_bat_buoc, status, ghi_chu)
VALUES 
    ('XE', 'Xe máy', NULL, '{"so_khung": true, "so_may": true}'::jsonb, true, 'Root category - Vehicles'),
    ('PT', 'Phụ tùng', NULL, '{}'::jsonb, true, 'Root category - Spare Parts')
ON CONFLICT (ma_nhom) DO UPDATE SET
    thong_so_bat_buoc = EXCLUDED.thong_so_bat_buoc,
    ghi_chu = EXCLUDED.ghi_chu;

-- =====================================================
-- BƯỚC 2: MIGRATE BRANDS (sys_nhan_hieu → dm_nhom_hang)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sys_nhan_hieu') THEN
        INSERT INTO dm_nhom_hang (ma_nhom, ten_nhom, ma_nhom_cha, status, ghi_chu)
        SELECT 
            nh.ma_nh as ma_nhom,
            nh.ten_nh as ten_nhom,
            'XE' as ma_nhom_cha,
            COALESCE(nh.status, true) as status,
            'Migrated from sys_nhan_hieu' as ghi_chu
        FROM sys_nhan_hieu nh
        WHERE NOT EXISTS (
            SELECT 1 FROM dm_nhom_hang WHERE ma_nhom = nh.ma_nh
        );
        
        RAISE NOTICE 'Migrated brands from sys_nhan_hieu to dm_nhom_hang';
    ELSE
        RAISE NOTICE 'Table sys_nhan_hieu does not exist, skipping brand migration';
    END IF;
END $$;

-- =====================================================
-- BƯỚC 3: MIGRATE VEHICLE MODELS (tm_xe_loai → tm_hang_hoa)
-- =====================================================

DO $$
DECLARE
    v_migrated_count INTEGER := 0;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tm_xe_loai') THEN
        -- Migrate vehicle models
        INSERT INTO tm_hang_hoa (
            ma_hang_hoa, ten_hang_hoa, ma_nhom_hang, loai_quan_ly,
            gia_von_mac_dinh, gia_ban_mac_dinh, don_vi_tinh,
            thong_so_ky_thuat, status, ngay_tao
        )
        SELECT 
            lx.ma_loai as ma_hang_hoa,
            lx.ten_loai as ten_hang_hoa,
            COALESCE(lx.ma_nh, 'XE') as ma_nhom_hang,
            'SERIAL' as loai_quan_ly,
            COALESCE(lx.gia_nhap, 0) as gia_von_mac_dinh,
            COALESCE(lx.gia_ban, 0) as gia_ban_mac_dinh,
            'Chiếc' as don_vi_tinh,
            jsonb_build_object(
                'phan_khoi', COALESCE(lx.phan_khoi, 0),
                'noi_sx', COALESCE(
                    (SELECT ten_noi_sx FROM sys_noi_sx WHERE ma = lx.noi_sx),
                    'Không xác định'
                ),
                'loai_hinh', COALESCE(
                    (SELECT ten_lh FROM sys_loai_hinh WHERE ma_lh = lx.loai_hinh),
                    'Không xác định'
                ),
                'gia_thue', COALESCE(lx.gia_thue, 0),
                'vat', COALESCE(lx.vat, 0)
            ) as thong_so_ky_thuat,
            COALESCE(lx.status, true) as status,
            COALESCE(lx.ngay_tao, CURRENT_TIMESTAMP) as ngay_tao
        FROM tm_xe_loai lx
        WHERE NOT EXISTS (
            SELECT 1 FROM tm_hang_hoa WHERE ma_hang_hoa = lx.ma_loai
        );
        
        GET DIAGNOSTICS v_migrated_count = ROW_COUNT;
        RAISE NOTICE 'Migrated % vehicle models from tm_xe_loai to tm_hang_hoa', v_migrated_count;
    ELSE
        RAISE NOTICE 'Table tm_xe_loai does not exist, skipping vehicle model migration';
    END IF;
END $$;

-- =====================================================
-- BƯỚC 4: MIGRATE VEHICLE INSTANCES (tm_xe_thuc_te → tm_hang_hoa_serial)
-- =====================================================

DO $$
DECLARE
    v_migrated_count INTEGER := 0;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tm_xe_thuc_te') THEN
        -- Migrate vehicle instances
        INSERT INTO tm_hang_hoa_serial (
            ma_serial, ma_hang_hoa, serial_identifier,
            ma_kho_hien_tai, trang_thai, locked, locked_reason,
            gia_von, thuoc_tinh_rieng, ngay_nhap_kho, ghi_chu, ngay_tao
        )
        SELECT 
            x.xe_key as ma_serial,
            x.ma_loai_xe as ma_hang_hoa,
            x.so_khung as serial_identifier,
            x.ma_kho_hien_tai,
            COALESCE(x.trang_thai, 'TON_KHO') as trang_thai,
            COALESCE(x.locked, false) as locked,
            x.locked_reason,
            x.gia_nhap as gia_von,
            jsonb_build_object(
                'so_khung', x.so_khung,
                'so_may', x.so_may,
                'mau_sac', jsonb_build_object(
                    'ma', COALESCE(x.ma_mau, 'UNKNOWN'),
                    'ten', COALESCE(
                        (SELECT ten_mau FROM sys_mau WHERE ma_mau = x.ma_mau),
                        'Chưa xác định'
                    ),
                    'hex', COALESCE(
                        (SELECT gia_tri FROM sys_mau WHERE ma_mau = x.ma_mau),
                        NULL
                    )
                )
            ) as thuoc_tinh_rieng,
            COALESCE(x.ngay_nhap, CURRENT_TIMESTAMP) as ngay_nhap_kho,
            x.ghi_chu,
            COALESCE(x.ngay_tao, CURRENT_TIMESTAMP) as ngay_tao
        FROM tm_xe_thuc_te x
        WHERE NOT EXISTS (
            SELECT 1 FROM tm_hang_hoa_serial WHERE ma_serial = x.xe_key
        )
        AND EXISTS (
            SELECT 1 FROM tm_hang_hoa WHERE ma_hang_hoa = x.ma_loai_xe
        );
        
        GET DIAGNOSTICS v_migrated_count = ROW_COUNT;
        RAISE NOTICE 'Migrated % vehicle instances from tm_xe_thuc_te to tm_hang_hoa_serial', v_migrated_count;
    ELSE
        RAISE NOTICE 'Table tm_xe_thuc_te does not exist, skipping vehicle instance migration';
    END IF;
END $$;

-- =====================================================
-- BƯỚC 5: MIGRATE SPARE PARTS (tm_phu_tung → tm_hang_hoa)
-- =====================================================

DO $$
DECLARE
    v_migrated_count INTEGER := 0;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tm_phu_tung') THEN
        -- Migrate spare parts catalog
        INSERT INTO tm_hang_hoa (
            ma_hang_hoa, ten_hang_hoa, ma_nhom_hang, loai_quan_ly,
            gia_von_mac_dinh, gia_ban_mac_dinh, don_vi_tinh,
            mo_ta, status, ngay_tao
        )
        SELECT 
            pt.ma_pt as ma_hang_hoa,
            pt.ten_pt as ten_hang_hoa,
            COALESCE(pt.nhom_pt, 'PT') as ma_nhom_hang,
            'BATCH' as loai_quan_ly,
            COALESCE(pt.gia_nhap, 0) as gia_von_mac_dinh,
            COALESCE(pt.gia_ban, 0) as gia_ban_mac_dinh,
            COALESCE(pt.don_vi_tinh, 'Cái') as don_vi_tinh,
            pt.ghi_chu as mo_ta,
            COALESCE(pt.status, true) as status,
            COALESCE(pt.ngay_tao, CURRENT_TIMESTAMP) as ngay_tao
        FROM tm_phu_tung pt
        WHERE NOT EXISTS (
            SELECT 1 FROM tm_hang_hoa WHERE ma_hang_hoa = pt.ma_pt
        );
        
        GET DIAGNOSTICS v_migrated_count = ROW_COUNT;
        RAISE NOTICE 'Migrated % spare parts from tm_phu_tung to tm_hang_hoa', v_migrated_count;
        
        -- Migrate spare parts inventory
        INSERT INTO tm_hang_hoa_ton_kho (
            ma_hang_hoa, ma_kho, so_luong_ton, so_luong_khoa,
            so_luong_toi_thieu, gia_von_binh_quan
        )
        SELECT 
            tk.ma_pt as ma_hang_hoa,
            tk.ma_kho,
            COALESCE(tk.so_luong_ton, 0) as so_luong_ton,
            COALESCE(tk.so_luong_khoa, 0) as so_luong_khoa,
            COALESCE(tk.so_luong_toi_thieu, 0) as so_luong_toi_thieu,
            COALESCE(tk.gia_von_binh_quan, 0) as gia_von_binh_quan
        FROM tm_phu_tung_ton_kho tk
        WHERE NOT EXISTS (
            SELECT 1 FROM tm_hang_hoa_ton_kho 
            WHERE ma_hang_hoa = tk.ma_pt AND ma_kho = tk.ma_kho
        )
        AND EXISTS (
            SELECT 1 FROM tm_hang_hoa WHERE ma_hang_hoa = tk.ma_pt
        );
        
        RAISE NOTICE 'Migrated spare parts inventory from tm_phu_tung_ton_kho to tm_hang_hoa_ton_kho';
    ELSE
        RAISE NOTICE 'Table tm_phu_tung does not exist, skipping spare parts migration';
    END IF;
END $$;

-- =====================================================
-- BƯỚC 6: MIGRATE HISTORY (Nếu có bảng lịch sử riêng)
-- =====================================================

DO $$
BEGIN
    -- Migrate vehicle history
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tm_xe_lich_su') THEN
        INSERT INTO tm_hang_hoa_lich_su (
            ma_hang_hoa, ma_serial, loai_giao_dich, so_chung_tu,
            ngay_giao_dich, ma_kho_xuat, ma_kho_nhap,
            so_luong, don_gia, thanh_tien, nguoi_thuc_hien, dien_giai
        )
        SELECT 
            ls.ma_loai_xe as ma_hang_hoa,
            ls.xe_key as ma_serial,
            ls.loai_giao_dich,
            ls.so_chung_tu,
            ls.ngay_giao_dich,
            ls.ma_kho_xuat,
            ls.ma_kho_nhap,
            1 as so_luong,
            ls.don_gia,
            ls.thanh_tien,
            ls.nguoi_thuc_hien,
            ls.dien_giai
        FROM tm_xe_lich_su ls
        WHERE NOT EXISTS (
            SELECT 1 FROM tm_hang_hoa_lich_su 
            WHERE ma_serial = ls.xe_key 
              AND ngay_giao_dich = ls.ngay_giao_dich
        );
        
        RAISE NOTICE 'Migrated vehicle history from tm_xe_lich_su to tm_hang_hoa_lich_su';
    END IF;
    
    -- Migrate spare parts history
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tm_phu_tung_lich_su') THEN
        INSERT INTO tm_hang_hoa_lich_su (
            ma_hang_hoa, loai_giao_dich, so_chung_tu,
            ngay_giao_dich, ma_kho_xuat, ma_kho_nhap,
            so_luong, don_gia, thanh_tien, nguoi_thuc_hien, dien_giai
        )
        SELECT 
            ls.ma_pt as ma_hang_hoa,
            ls.loai_giao_dich,
            ls.so_chung_tu,
            ls.ngay_giao_dich,
            ls.ma_kho_xuat,
            ls.ma_kho_nhap,
            ls.so_luong,
            ls.don_gia,
            ls.thanh_tien,
            ls.nguoi_thuc_hien,
            ls.dien_giai
        FROM tm_phu_tung_lich_su ls
        WHERE NOT EXISTS (
            SELECT 1 FROM tm_hang_hoa_lich_su 
            WHERE ma_hang_hoa = ls.ma_pt 
              AND ngay_giao_dich = ls.ngay_giao_dich
        );
        
        RAISE NOTICE 'Migrated spare parts history from tm_phu_tung_lich_su to tm_hang_hoa_lich_su';
    END IF;
END $$;

-- =====================================================
-- BƯỚC 7: MARK OLD TABLES AS DEPRECATED
-- =====================================================

DO $$
BEGIN
    -- Mark old tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tm_xe_loai') THEN
        COMMENT ON TABLE tm_xe_loai IS 'DEPRECATED (2026-01-26): Migrated to tm_hang_hoa with loai_quan_ly=SERIAL';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tm_xe_thuc_te') THEN
        COMMENT ON TABLE tm_xe_thuc_te IS 'DEPRECATED (2026-01-26): Migrated to tm_hang_hoa_serial';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tm_phu_tung') THEN
        COMMENT ON TABLE tm_phu_tung IS 'DEPRECATED (2026-01-26): Migrated to tm_hang_hoa with loai_quan_ly=BATCH';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sys_nhan_hieu') THEN
        COMMENT ON TABLE sys_nhan_hieu IS 'DEPRECATED (2026-01-26): Migrated to dm_nhom_hang as children of XE';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sys_mau') THEN
        COMMENT ON TABLE sys_mau IS 'DEPRECATED (2026-01-26): Colors now stored in tm_hang_hoa_serial.thuoc_tinh_rieng JSONB';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tm_xe_mau') THEN
        COMMENT ON TABLE tm_xe_mau IS 'DEPRECATED (2026-01-26): Color mapping moved to JSONB';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sys_noi_sx') THEN
        COMMENT ON TABLE sys_noi_sx IS 'DEPRECATED (2026-01-26): Origin info now in tm_hang_hoa.thong_so_ky_thuat JSONB';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sys_loai_hinh') THEN
        COMMENT ON TABLE sys_loai_hinh IS 'DEPRECATED (2026-01-26): Vehicle type info now in tm_hang_hoa.thong_so_ky_thuat JSONB';
    END IF;
END $$;

-- =====================================================
-- BƯỚC 8: VALIDATION & REPORTING
-- =====================================================

DO $$
DECLARE
    v_brands INTEGER;
    v_vehicle_models INTEGER;
    v_vehicle_instances INTEGER;
    v_spare_parts INTEGER;
    v_spare_parts_inventory INTEGER;
BEGIN
    -- Count migrated data
    SELECT COUNT(*) INTO v_brands 
    FROM dm_nhom_hang WHERE ma_nhom_cha = 'XE';
    
    SELECT COUNT(*) INTO v_vehicle_models 
    FROM tm_hang_hoa WHERE loai_quan_ly = 'SERIAL';
    
    SELECT COUNT(*) INTO v_vehicle_instances 
    FROM tm_hang_hoa_serial;
    
    SELECT COUNT(*) INTO v_spare_parts 
    FROM tm_hang_hoa WHERE loai_quan_ly = 'BATCH';
    
    SELECT COUNT(*) INTO v_spare_parts_inventory 
    FROM tm_hang_hoa_ton_kho;
    
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Migration 009: Data Migration Summary';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Vehicle Brands: %', v_brands;
    RAISE NOTICE 'Vehicle Models: %', v_vehicle_models;
    RAISE NOTICE 'Vehicle Instances: %', v_vehicle_instances;
    RAISE NOTICE 'Spare Parts: %', v_spare_parts;
    RAISE NOTICE 'Spare Parts Inventory Records: %', v_spare_parts_inventory;
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Old tables marked as DEPRECATED.';
    RAISE NOTICE 'Keep old tables for 3 months before archiving.';
    RAISE NOTICE '==============================================';
END $$;
