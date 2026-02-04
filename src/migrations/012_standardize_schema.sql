-- =====================================================
-- MIGRATION 012: SCHEMA STANDARDIZATION
-- Description: Standardize all tables to use created_at and updated_at
-- =====================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1. Standardize sys_user (Already has created_at/updated_at, but adding ngay_cap_nhat check)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sys_user' AND column_name = 'ngay_cap_nhat') THEN
        ALTER TABLE sys_user DROP COLUMN ngay_cap_nhat;
    END IF;

    -- 2. Standardize sys_kho
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sys_kho' AND column_name = 'ngay_tao') THEN
        ALTER TABLE sys_kho RENAME COLUMN ngay_tao TO created_at;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sys_kho' AND column_name = 'ngay_cap_nhat') THEN
        ALTER TABLE sys_kho RENAME COLUMN ngay_cap_nhat TO updated_at;
    END IF;

    -- 3. Standardize dm_doi_tac
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dm_doi_tac' AND column_name = 'ngay_tao') THEN
        ALTER TABLE dm_doi_tac RENAME COLUMN ngay_tao TO created_at;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dm_doi_tac' AND column_name = 'ngay_cap_nhat') THEN
        ALTER TABLE dm_doi_tac RENAME COLUMN ngay_cap_nhat TO updated_at;
    END IF;

    -- 4. Standardize dm_nhom_hang
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dm_nhom_hang' AND column_name = 'ngay_tao') THEN
        ALTER TABLE dm_nhom_hang RENAME COLUMN ngay_tao TO created_at;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dm_nhom_hang' AND column_name = 'ngay_cap_nhat') THEN
        ALTER TABLE dm_nhom_hang RENAME COLUMN ngay_cap_nhat TO updated_at;
    END IF;

    -- 5. Standardize tm_hang_hoa
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_hang_hoa' AND column_name = 'ngay_tao') THEN
        ALTER TABLE tm_hang_hoa RENAME COLUMN ngay_tao TO created_at;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_hang_hoa' AND column_name = 'ngay_cap_nhat') THEN
        ALTER TABLE tm_hang_hoa RENAME COLUMN ngay_cap_nhat TO updated_at;
    END IF;

    -- 6. Standardize tm_hang_hoa_serial
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_hang_hoa_serial' AND column_name = 'ngay_tao') THEN
        ALTER TABLE tm_hang_hoa_serial RENAME COLUMN ngay_tao TO created_at;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_hang_hoa_serial' AND column_name = 'ngay_cap_nhat') THEN
        ALTER TABLE tm_hang_hoa_serial RENAME COLUMN ngay_cap_nhat TO updated_at;
    END IF;

    -- 6.1 Standardize tm_hang_hoa_ton_kho
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_hang_hoa_ton_kho' AND column_name = 'cap_nhat_cuoi') THEN
        ALTER TABLE tm_hang_hoa_ton_kho RENAME COLUMN cap_nhat_cuoi TO updated_at;
    END IF;
    -- Adding created_at to tm_hang_hoa_ton_kho
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_hang_hoa_ton_kho' AND column_name = 'created_at') THEN
        ALTER TABLE tm_hang_hoa_ton_kho ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- 7. Standardize tm_don_hang
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_don_hang' AND column_name = 'ngay_tao') THEN
        ALTER TABLE tm_don_hang RENAME COLUMN ngay_tao TO created_at;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_don_hang' AND column_name = 'ngay_cap_nhat') THEN
        ALTER TABLE tm_don_hang RENAME COLUMN ngay_cap_nhat TO updated_at;
    END IF;

    -- 8. Standardize tm_hoa_don
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_hoa_don' AND column_name = 'ngay_tao') THEN
        ALTER TABLE tm_hoa_don RENAME COLUMN ngay_tao TO created_at;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_hoa_don' AND column_name = 'ngay_cap_nhat') THEN
        ALTER TABLE tm_hoa_don RENAME COLUMN ngay_cap_nhat TO updated_at;
    END IF;

    -- 9. Standardize sys_role
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sys_role' AND column_name = 'ngay_tao') THEN
        ALTER TABLE sys_role RENAME COLUMN ngay_tao TO created_at;
    END IF;
    -- Adding updated_at to sys_role
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sys_role' AND column_name = 'updated_at') THEN
        ALTER TABLE sys_role ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;

    RAISE NOTICE 'Schema standardization completed successfully';
END $$;
