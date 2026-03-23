-- Migration 059: Fix Missing created_by in tm_hoa_don
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_hoa_don' AND column_name = 'created_by') THEN
        ALTER TABLE tm_hoa_don ADD COLUMN created_by INTEGER REFERENCES sys_user(id);
    END IF;
END $$;
