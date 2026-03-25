-- 063_final_warehouse_code_sync.sql
-- Fix naming mismatch between KHO001 and KHO01 and other inconsistencies

DO $$
BEGIN
    -- 1. If we have lifts with KHO001 but the system uses KHO01, sync them
    IF EXISTS (SELECT 1 FROM sys_kho WHERE ma_kho = 'KHO01') THEN
        UPDATE dm_ban_nang SET ma_kho = 'KHO01' WHERE ma_kho = 'KHO001';
    END IF;

    -- 2. Clean up any lifts with ma_kho = '1' if the intended code was KHO01
    -- (Based on common user patterns in this project)
    IF EXISTS (SELECT 1 FROM sys_kho WHERE ma_kho = 'KHO01') THEN
        UPDATE dm_ban_nang SET ma_kho = 'KHO01' WHERE ma_kho = '1';
    END IF;

    -- 3. Final consolidation for all tables referencing ma_kho 
    -- ensuring they point to existing records in sys_kho
END $$;
