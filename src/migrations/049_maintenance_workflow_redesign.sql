-- =====================================================
-- MIGRATION 049: MAINTENANCE WORKFLOW REDESIGN
-- Description: Implement real-world service workshop workflow
-- Author: Antigravity
-- Date: 2026-02-27
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_trang_thai_bao_tri') THEN
    CREATE TYPE enum_trang_thai_bao_tri AS ENUM ('TIEP_NHAN', 'DANG_SUA', 'CHO_THANH_TOAN', 'HOAN_THANH', 'DA_HUY');
  END IF;
END $$;

-- 1. Bàn nâng (Workstations/Lifts)
CREATE TABLE IF NOT EXISTS dm_ban_nang (
    id SERIAL PRIMARY KEY,
    ma_ban_nang VARCHAR(50) UNIQUE NOT NULL,
    ten_ban_nang VARCHAR(100) NOT NULL,
    trang_thai VARCHAR(50) DEFAULT 'TRONG', -- TRONG, DANG_SUA, BAO_TRI
    ghi_chu TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed some default lifts
INSERT INTO dm_ban_nang (ma_ban_nang, ten_ban_nang) VALUES 
('BN_01', 'Bàn nâng số 1'),
('BN_02', 'Bàn nâng số 2'),
('BN_03', 'Bàn nâng số 3'),
('BN_04', 'Bàn nâng số 4'),
('BN_WAIT', 'Khu vực chờ')
ON CONFLICT (ma_ban_nang) DO NOTHING;

-- 2. Update existing maintenance table for new workflow
ALTER TABLE tm_bao_tri
  ADD COLUMN IF NOT EXISTS ma_ban_nang VARCHAR(50) REFERENCES dm_ban_nang(ma_ban_nang),
  ADD COLUMN IF NOT EXISTS trang_thai enum_trang_thai_bao_tri DEFAULT 'TIEP_NHAN',
  ADD COLUMN IF NOT EXISTS tien_phu_tung DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tien_cong DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS thoi_gian_bat_dau TIMESTAMP,
  ADD COLUMN IF NOT EXISTS thoi_gian_ket_thuc TIMESTAMP,
  ADD COLUMN IF NOT EXISTS ktv_chinh INTEGER REFERENCES sys_user(id);

-- Clean up older approval flow column implications if needed (we just leave them as is, or nullable)
-- Ensure 'trang_thai' has a realistic value for existing records
UPDATE tm_bao_tri SET trang_thai = 'HOAN_THANH' WHERE trang_thai IS NULL;

-- 3. Maintenance Reminders (CSKH)
CREATE TABLE IF NOT EXISTS tm_nhac_nho_bao_duong (
    id SERIAL PRIMARY KEY,
    ma_serial VARCHAR(100) REFERENCES tm_hang_hoa_serial(ma_serial),
    ma_khach_hang VARCHAR(50) REFERENCES dm_doi_tac(ma_doi_tac),
    loai_nhac_nho VARCHAR(50), -- THAY_NHOT, BAO_DUONG_DINH_KY
    ngay_du_kien DATE,
    so_km_du_kien INTEGER,
    trang_thai VARCHAR(20) DEFAULT 'CHUA_XU_LY', -- CHUA_XU_LY, DA_XU_LY, BO_QUA
    ghi_chu TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tm_nhac_nho_ngay ON tm_nhac_nho_bao_duong(ngay_du_kien);
CREATE INDEX IF NOT EXISTS idx_tm_nhac_nho_trang_thai ON tm_nhac_nho_bao_duong(trang_thai);

DO $$
BEGIN
    RAISE NOTICE 'Migration 049: Maintenance workflow redesign completed successfully';
END $$;
