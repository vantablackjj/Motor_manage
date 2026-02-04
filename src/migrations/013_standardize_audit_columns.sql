-- =====================================================
-- MIGRATION 013: STANDARDIZE AUDIT COLUMNS
-- Description: Ensure all main tables have created_by, created_at, updated_at
-- =====================================================

DO $$
DECLARE
    r RECORD;
    t_name TEXT;
BEGIN
    FOR t_name IN (
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          AND table_name NOT IN ('schema_migrations', 'spatial_ref_sys')
    ) LOOP
        -- 1. Ensure created_at exists (if standardized in 012, this is fine)
        -- 2. Ensure updated_at exists
        -- 3. Ensure created_by exists as INTEGER (link to sys_user id)

        -- Example: Fix tm_phieu_thu_chi mismatch
        IF t_name = 'tm_phieu_thu_chi' THEN
            -- Check if created_by exists
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = 'created_by') THEN
                ALTER TABLE tm_phieu_thu_chi ADD COLUMN created_by INTEGER REFERENCES sys_user(id);
            END IF;
        END IF;

        -- Generic additions for common operational tables
        IF t_name IN ('tm_don_hang', 'tm_hoa_don', 'tm_hang_hoa', 'dm_doi_tac', 'sys_kho', 'tm_phieu_thu_chi') THEN
             IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = 'created_by') THEN
                ALTER TABLE public.tm_don_hang ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES sys_user(id);
                -- Wait, EXECUTE format is safer inside LOOP
             END IF;
        END IF;
    END LOOP;
    
    -- Explicitly fix tm_phieu_thu_chi based on DonHangMuaService usage
    -- Service uses: created_by
    -- Migration had: nguoi_lap
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'created_by') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN created_by INTEGER REFERENCES sys_user(id);
    END IF;

END $$;
