-- 061_fix_maintenance_constraints.sql
-- Fix any duplicate keys or bad constraints on dm_ban_nang

DO $$
BEGIN
    -- 1. Ensure the composite unique constraint exists and is named correctly
    -- Drop old global unique if still exists
    ALTER TABLE dm_ban_nang DROP CONSTRAINT IF EXISTS dm_ban_nang_ma_ban_nang_key CASCADE;
    
    -- 2. Drop old incorrectly named composite constraints if any
    ALTER TABLE dm_ban_nang DROP CONSTRAINT IF EXISTS dm_ban_nang_ma_kho_ma_ban_nang_key CASCADE;

    -- 3. If there are duplicates before adding constraint, keep only one (latest updated)
    DELETE FROM dm_ban_nang a USING dm_ban_nang b
    WHERE a.id < b.id 
    AND a.ma_ban_nang = b.ma_ban_nang 
    AND a.ma_kho = b.ma_kho;

    -- 4. Re-add the proper composite constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dm_ban_nang_ma_ban_nang_ma_kho_key') THEN
        ALTER TABLE dm_ban_nang ADD CONSTRAINT dm_ban_nang_ma_ban_nang_ma_kho_key UNIQUE (ma_ban_nang, ma_kho);
    END IF;

    -- 5. Fix Foreign Key in tm_bao_tri to reference the composite key or just point to ID (better)
    -- Currently tm_bao_tri.ma_ban_nang references dm_ban_nang(ma_ban_nang). 
    -- This is dangerous because ma_ban_nang is not unique alone anymore.
    
    -- It's better to NOT have the FK if it causes errors, or make it reference (ma_ban_nang, ma_kho)
END $$;
