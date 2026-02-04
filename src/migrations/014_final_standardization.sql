-- =====================================================
-- MIGRATION 014: FINAL GLOBAL STANDARDIZATION
-- Description: Catch-all rename for audit columns in ANY table
-- =====================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND column_name IN ('ngay_tao', 'ngay_cap_nhat', 'cap_nhat_cuoi')
    ) LOOP
        IF r.column_name = 'ngay_tao' THEN
            -- Check if created_at already exists
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = r.table_name AND column_name = 'created_at') THEN
                EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO created_at', r.table_name, r.column_name);
            ELSE
                -- Update existing created_at if null? No, just drop the old one
                EXECUTE format('ALTER TABLE %I DROP COLUMN %I', r.table_name, r.column_name);
            END IF;
            
        ELSIF r.column_name IN ('ngay_cap_nhat', 'cap_nhat_cuoi') THEN
            -- Check if updated_at already exists
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = r.table_name AND column_name = 'updated_at') THEN
                EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO updated_at', r.table_name, r.column_name);
            ELSE
                EXECUTE format('ALTER TABLE %I DROP COLUMN %I', r.table_name, r.column_name);
            END IF;
        END IF;
    END LOOP;
END $$;
