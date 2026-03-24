-- =====================================================
-- SCRIPT: MERGE DUPLICATE ROLES (SALE -> BAN_HANG)
-- Description: Merge role 'SALE' into 'BAN_HANG', transfer users and delete duplicate
-- =====================================================

DO $$
DECLARE
    target_role_id INTEGER;
    source_role_id INTEGER;
BEGIN
    -- 1. Find ID of BAN_HANG (Target Role)
    SELECT id INTO target_role_id FROM sys_role WHERE ma_quyen = 'BAN_HANG';
    
    -- 2. Find ID of SALE (Source Role)
    SELECT id INTO source_role_id FROM sys_role 
    WHERE (ma_quyen = 'SALE' OR ten_quyen ILIKE 'Sale%')
    AND id != target_role_id 
    LIMIT 1;

    IF source_role_id IS NOT NULL AND target_role_id IS NOT NULL THEN
        RAISE NOTICE 'Merging Role ID % (source) into ID % (target)', source_role_id, target_role_id;

        -- 3. Transfer users in sys_user
        UPDATE sys_user 
        SET role_id = target_role_id, 
            vai_tro = 'BAN_HANG'
        WHERE role_id = source_role_id;
        
        -- 4. Transfer role assignments in sys_user_role
        DELETE FROM sys_user_role WHERE role_id = source_role_id AND user_id IN (
            SELECT user_id FROM sys_user_role WHERE role_id = target_role_id
        );
        
        UPDATE sys_user_role 
        SET role_id = target_role_id 
        WHERE role_id = source_role_id;

        -- 5. Delete old role
        DELETE FROM sys_role WHERE id = source_role_id;
        
        RAISE NOTICE 'Merge complete!';
    ELSE
        IF target_role_id IS NULL THEN
            RAISE NOTICE 'Target role BAN_HANG not found.';
        ELSE
            RAISE NOTICE 'Source role SALE not found. Nothing to merge.';
        END IF;
    END IF;
END $$;
