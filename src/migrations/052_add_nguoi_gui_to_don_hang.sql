-- =====================================================
-- MIGRATION 052: ADD NGUOI GUI TO DON HANG
-- Description: Add nguoi_gui and ngay_gui to tm_don_hang
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_don_hang' AND column_name = 'nguoi_gui') THEN
        ALTER TABLE tm_don_hang ADD COLUMN nguoi_gui VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_don_hang' AND column_name = 'ngay_gui') THEN
        ALTER TABLE tm_don_hang ADD COLUMN ngay_gui TIMESTAMP;
    END IF;
END $$;
