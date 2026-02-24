-- =====================================================
-- MIGRATION 039: ENSURE VAT & DISCOUNT COLUMNS
-- Mục đích: Đảm bảo tm_don_hang và tm_hoa_don
--           có đủ các cột VAT và chiết khấu.
-- Author: System
-- Date: 2026-02-24
-- =====================================================

DO $$
BEGIN
    -- ------------------------------------------------
    -- tm_don_hang
    -- ------------------------------------------------

    -- chiet_khau: chiết khấu tổng đơn (số tiền tuyệt đối)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tm_don_hang' AND column_name = 'chiet_khau'
    ) THEN
        ALTER TABLE tm_don_hang ADD COLUMN chiet_khau DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added chiet_khau to tm_don_hang';
    END IF;

    -- vat_percentage: % VAT (ví dụ: 10 => 10%)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tm_don_hang' AND column_name = 'vat_percentage'
    ) THEN
        ALTER TABLE tm_don_hang ADD COLUMN vat_percentage DECIMAL(5,2) DEFAULT 0;
        RAISE NOTICE 'Added vat_percentage to tm_don_hang';
    END IF;

    -- thanh_tien: = tong_gia_tri - chiet_khau + (base * vat%)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tm_don_hang' AND column_name = 'thanh_tien'
    ) THEN
        ALTER TABLE tm_don_hang ADD COLUMN thanh_tien DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added thanh_tien to tm_don_hang';
    END IF;

    -- ------------------------------------------------
    -- tm_hoa_don
    -- ------------------------------------------------

    -- chiet_khau (hóa đơn)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tm_hoa_don' AND column_name = 'chiet_khau'
    ) THEN
        ALTER TABLE tm_hoa_don ADD COLUMN chiet_khau DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added chiet_khau to tm_hoa_don';
    END IF;

    -- tien_thue_gtgt: số tiền thuế VAT thực tế
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tm_hoa_don' AND column_name = 'tien_thue_gtgt'
    ) THEN
        ALTER TABLE tm_hoa_don ADD COLUMN tien_thue_gtgt DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added tien_thue_gtgt to tm_hoa_don';
    END IF;

    -- ------------------------------------------------
    -- Cập nhật thanh_tien cho các đơn cũ chưa có giá trị
    -- (tong_gia_tri - chiet_khau + (base * vat_percentage/100))
    -- ------------------------------------------------
    UPDATE tm_don_hang
    SET thanh_tien = (
        (tong_gia_tri - COALESCE(chiet_khau, 0))
        + ((tong_gia_tri - COALESCE(chiet_khau, 0)) * COALESCE(vat_percentage, 0) / 100)
    )
    WHERE thanh_tien = 0 AND tong_gia_tri > 0;

    -- Cập nhật thanh_tien cho các hóa đơn cũ
    UPDATE tm_hoa_don
    SET thanh_tien = (
        (tong_tien - COALESCE(chiet_khau, 0))
        + COALESCE(tien_thue_gtgt, 0)
    )
    WHERE thanh_tien = 0 AND tong_tien > 0;

    RAISE NOTICE 'Migration 039: VAT & discount columns ensured successfully';
END $$;
