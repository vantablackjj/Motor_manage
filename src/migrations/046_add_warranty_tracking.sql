-- =====================================================
-- MIGRATION 046: ADD WARRANTY TRACKING TO MAINTENANCE
-- Description: Track if maintenance is free/under warranty
-- Author: Antigravity
-- Date: 2026-02-26
-- =====================================================

-- Phân loại bảo trì
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_loai_bao_tri') THEN
    CREATE TYPE enum_loai_bao_tri AS ENUM ('MIEN_PHI', 'TINH_PHI', 'BAO_HANH');
  END IF;
END $$;

ALTER TABLE tm_bao_tri 
  ADD COLUMN IF NOT EXISTS loai_bao_tri enum_loai_bao_tri DEFAULT 'TINH_PHI';

-- Ghi chú thêm về lý do miễn phí/bảo hành
ALTER TABLE tm_bao_tri 
  ADD COLUMN IF NOT EXISTS ly_do_mien_phi TEXT;

-- Index
CREATE INDEX IF NOT EXISTS idx_tm_bao_tri_loai ON tm_bao_tri(loai_bao_tri);

DO $$
BEGIN
    RAISE NOTICE 'Migration 046: Warranty tracking added';
END $$;
