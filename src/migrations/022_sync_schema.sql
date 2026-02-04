-- =====================================================
-- MIGRATION 022: SYNC SCHEMA WITH DATABASE STATE
-- Description: Add missing columns, enums and indices found in current DB
-- Author: Antigravity AI
-- Date: 2026-02-04
-- =====================================================

-- 1. Update Enums
DO $$
BEGIN
    -- enum_loai_don_hang: Add MUA_XE
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_loai_don_hang') THEN
        ALTER TYPE enum_loai_don_hang ADD VALUE IF NOT EXISTS 'MUA_XE';
    END IF;

    -- enum_trang_thai_don_hang: Add missing states for approval workflow
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_trang_thai_don_hang') THEN
        ALTER TYPE enum_trang_thai_don_hang ADD VALUE IF NOT EXISTS 'GUI_DUYET';
        ALTER TYPE enum_trang_thai_don_hang ADD VALUE IF NOT EXISTS 'DA_HUY';
        ALTER TYPE enum_trang_thai_don_hang ADD VALUE IF NOT EXISTS 'TU_CHOI';
        ALTER TYPE enum_trang_thai_don_hang ADD VALUE IF NOT EXISTS 'DANG_NHAP_KHO';
        ALTER TYPE enum_trang_thai_don_hang ADD VALUE IF NOT EXISTS 'DA_NHAP_KHO';
    END IF;
END $$;

-- 2. Update tm_don_hang (Missing columns from 004 and latest updates)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_don_hang' AND column_name = 'nguoi_gui') THEN
        ALTER TABLE tm_don_hang ADD COLUMN nguoi_gui INTEGER REFERENCES sys_user(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_don_hang' AND column_name = 'ngay_gui') THEN
        ALTER TABLE tm_don_hang ADD COLUMN ngay_gui TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_don_hang' AND column_name = 'updated_at') THEN
        ALTER TABLE tm_don_hang ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_don_hang' AND column_name = 'updated_by') THEN
        ALTER TABLE tm_don_hang ADD COLUMN updated_by INTEGER REFERENCES sys_user(id);
    END IF;
END $$;

-- 3. Update tm_phieu_thu_chi (Missing columns from 005/021 and latest updates)
DO $$
BEGIN
    -- Ensure trang_thai is VARCHAR to match current DB structure (avoiding missing enum issues)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'trang_thai') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN trang_thai VARCHAR(50) DEFAULT 'NHAP';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'nguoi_gui') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN nguoi_gui INTEGER REFERENCES sys_user(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'ngay_gui') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN ngay_gui TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'nguoi_huy') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN nguoi_huy INTEGER REFERENCES sys_user(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'ngay_huy') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN ngay_huy TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'ly_do_huy') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN ly_do_huy TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'metadata') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- 4. Standardize audit columns for other operational tables
DO $$
BEGIN
    -- tm_cong_no_doi_tac: updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_cong_no_doi_tac' AND column_name = 'updated_at') THEN
        ALTER TABLE tm_cong_no_doi_tac ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- tm_cong_no_noi_bo: updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_cong_no_noi_bo' AND column_name = 'updated_at') THEN
        ALTER TABLE tm_cong_no_noi_bo ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- tm_hang_hoa_ton_kho: created_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_hang_hoa_ton_kho' AND column_name = 'created_at') THEN
        ALTER TABLE tm_hang_hoa_ton_kho ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- 5. Update tm_hoa_don (Missing audit columns)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_hoa_don' AND column_name = 'updated_at') THEN
        ALTER TABLE tm_hoa_don ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_hoa_don' AND column_name = 'updated_by') THEN
        ALTER TABLE tm_hoa_don ADD COLUMN updated_by INTEGER REFERENCES sys_user(id);
    END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 022: Schema sync completed successfully';
END $$;
