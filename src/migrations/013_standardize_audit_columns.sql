-- =====================================================
-- MIGRATION 013: STANDARDIZE AUDIT COLUMNS (Idempotent)
-- Description: Ensure all main tables have created_by, created_at, updated_at
-- =====================================================

DO $$
DECLARE
    t_name TEXT;
BEGIN
    FOR t_name IN (
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          AND table_name IN ('tm_don_hang', 'tm_hoa_don', 'tm_hang_hoa', 'dm_doi_tac', 'sys_kho', 'tm_phieu_thu_chi')
    ) LOOP
        -- Ensure created_by exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = 'created_by') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN created_by INTEGER REFERENCES sys_user(id)', t_name);
        END IF;

        -- Ensure updated_by exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = 'updated_by') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN updated_by INTEGER REFERENCES sys_user(id)', t_name);
        END IF;
    END LOOP;
    
    -- Explicitly ensure metadata for tm_phieu_thu_chi
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'metadata') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;

    RAISE NOTICE 'Migration 013: Audit columns standardized';
END $$;
