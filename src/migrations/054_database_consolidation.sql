-- Migration 054: Database Consolidation & Final Patching
-- Move all "forced" logic from server.js into a clean migration

DO $$
BEGIN
    -- 1. Ensure Missing Enums in enum_trang_thai_don_hang
    BEGIN
        ALTER TYPE enum_trang_thai_don_hang ADD VALUE 'GUI_DUYET';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER TYPE enum_trang_thai_don_hang ADD VALUE 'CHO_DUYET';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER TYPE enum_trang_thai_don_hang ADD VALUE 'TU_CHOI';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER TYPE enum_trang_thai_don_hang ADD VALUE 'DA_HUY';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    -- 2. Ensure Missing Enums in enum_trang_thai
    BEGIN
        ALTER TYPE enum_trang_thai ADD VALUE 'GUI_DUYET';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER TYPE enum_trang_thai ADD VALUE 'CHO_DUYET';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER TYPE enum_trang_thai ADD VALUE 'TU_CHOI';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER TYPE enum_trang_thai ADD VALUE 'DA_HUY';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    -- 3. Structural verification for sys_user
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sys_user') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sys_user' AND column_name = 'ma_kho') THEN
            ALTER TABLE sys_user ADD COLUMN ma_kho VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sys_user' AND column_name = 'vai_tro') THEN
            ALTER TABLE sys_user ADD COLUMN vai_tro VARCHAR(50);
        END IF;
    END IF;

    -- 4. Structural verification for tm_hang_hoa_serial
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tm_hang_hoa_serial') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_hang_hoa_serial' AND column_name = 'han_dang_kiem') THEN
            ALTER TABLE tm_hang_hoa_serial ADD COLUMN han_dang_kiem DATE;
        END IF;
    END IF;

    -- 5. Structural verification for tm_don_hang
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tm_don_hang') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_don_hang' AND column_name = 'updated_at') THEN
            ALTER TABLE tm_don_hang ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_don_hang' AND column_name = 'updated_by') THEN
            ALTER TABLE tm_don_hang ADD COLUMN updated_by INTEGER;
        END IF;
    END IF;

    -- 6. Structural verification for tm_phieu_thu_chi
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tm_phieu_thu_chi') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'nguoi_gui') THEN
            ALTER TABLE tm_phieu_thu_chi ADD COLUMN nguoi_gui VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'ngay_gui') THEN
            ALTER TABLE tm_phieu_thu_chi ADD COLUMN ngay_gui TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'nguoi_huy') THEN
            ALTER TABLE tm_phieu_thu_chi ADD COLUMN nguoi_huy VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'ngay_huy') THEN
            ALTER TABLE tm_phieu_thu_chi ADD COLUMN ngay_huy TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'ly_do_huy') THEN
            ALTER TABLE tm_phieu_thu_chi ADD COLUMN ly_do_huy TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'updated_at') THEN
            ALTER TABLE tm_phieu_thu_chi ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'updated_by') THEN
            ALTER TABLE tm_phieu_thu_chi ADD COLUMN updated_by INTEGER;
        END IF;
    END IF;

    -- 7. Ensure default lifts for each warehouse
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dm_ban_nang') THEN
        INSERT INTO dm_ban_nang (ma_ban_nang, ten_ban_nang, ma_kho)
        SELECT 
            'BN_' || k.ma_kho || '_' || sub.i,
            'Bàn nâng ' || sub.i || ' - ' || k.ten_kho,
            k.ma_kho
        FROM sys_kho k
        CROSS JOIN (SELECT generate_series(1, 4) AS i) sub
        WHERE k.status = TRUE
        AND NOT EXISTS (SELECT 1 FROM dm_ban_nang WHERE ma_kho = k.ma_kho)
        ON CONFLICT (ma_ban_nang, ma_kho) DO NOTHING;
    END IF;

END $$;
