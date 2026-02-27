-- =====================================================
-- MIGRATION 050: ADD INSPECTION EXPIRY DATE
-- Description: Add han_dang_kiem column as discussed with user
-- Author: Antigravity
-- Date: 2026-02-27
-- =====================================================

ALTER TABLE tm_hang_hoa_serial ADD COLUMN IF NOT EXISTS han_dang_kiem DATE;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 050: Column han_dang_kiem added to tm_hang_hoa_serial successfully';
END $$;
