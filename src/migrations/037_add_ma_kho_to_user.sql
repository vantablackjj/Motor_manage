-- =====================================================
-- MIGRATION 037: ADD MA_KHO TO SYS_USER
-- Description: Cập nhật cấu trúc bảng sys_user để gán kho
-- Author: Backend Fix
-- Date: 2026-02-23
-- =====================================================

DO $$
BEGIN
    -- Thêm ma_kho vào sys_user (để gán user vào 1 kho chính)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sys_user' AND column_name = 'ma_kho'
    ) THEN
        ALTER TABLE sys_user ADD COLUMN ma_kho VARCHAR(50) REFERENCES sys_kho(ma_kho);
        RAISE NOTICE 'Added ma_kho column to sys_user table';
    ELSE
        RAISE NOTICE 'Column ma_kho already exists in sys_user table';
    END IF;
END $$;
