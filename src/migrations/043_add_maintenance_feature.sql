-- =====================================================
-- MIGRATION 043: ADD MAINTENANCE FEATURE
-- Description: Create maintenance tables and add KM tracking
-- Author: Antigravity
-- Date: 2026-02-26
-- =====================================================

-- Add current KM to serial tracking (actual vehicles)
ALTER TABLE tm_hang_hoa_serial ADD COLUMN IF NOT EXISTS so_km_hien_tai INTEGER DEFAULT 0;

-- Maintenance Records (Phiếu bảo trì)
CREATE TABLE IF NOT EXISTS tm_bao_tri (
    ma_phieu VARCHAR(50) PRIMARY KEY,
    ma_serial VARCHAR(100) REFERENCES tm_hang_hoa_serial(ma_serial),
    ma_doi_tac VARCHAR(50) REFERENCES dm_doi_tac(ma_doi_tac),
    ngay_bao_tri TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    so_km_hien_tai INTEGER NOT NULL,
    nguoi_lap_phieu VARCHAR(100),
    tong_tien DECIMAL(15,2) DEFAULT 0,
    ghi_chu TEXT,
    trang_thai VARCHAR(20) DEFAULT 'HOAN_THANH', -- HOAN_THANH, DANG_XU_LY, DA_HUY
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tm_bao_tri_serial ON tm_bao_tri(ma_serial);
CREATE INDEX idx_tm_bao_tri_doi_tac ON tm_bao_tri(ma_doi_tac);

-- Maintenance Details (Chi tiết hạng mục thay thế/sửa chữa)
CREATE TABLE IF NOT EXISTS tm_bao_tri_chi_tiet (
    id SERIAL PRIMARY KEY,
    ma_phieu VARCHAR(50) REFERENCES tm_bao_tri(ma_phieu) ON DELETE CASCADE,
    ma_hang_hoa VARCHAR(50) REFERENCES tm_hang_hoa(ma_hang_hoa), -- NULL nếu là hạng mục dịch vụ không quản lý kho
    ten_hang_muc VARCHAR(255) NOT NULL,
    loai_hang_muc VARCHAR(20) NOT NULL, -- PHU_TUNG, DICH_VU
    so_luong DECIMAL(15,2) DEFAULT 1,
    don_gia DECIMAL(15,2) DEFAULT 0,
    thanh_tien DECIMAL(15,2) DEFAULT 0,
    ghi_chu TEXT
);

-- Maintenance Reminders/Notifications (Nhắc lịch bảo trì và sinh nhật)
CREATE TABLE IF NOT EXISTS tm_nhac_nho (
    id SERIAL PRIMARY KEY,
    loai_nhac VARCHAR(20) NOT NULL, -- BAO_TRI, SINH_NHAT
    ma_serial VARCHAR(100) REFERENCES tm_hang_hoa_serial(ma_serial), -- NULL nếu là SINH_NHAT
    ma_doi_tac VARCHAR(50) REFERENCES dm_doi_tac(ma_doi_tac),
    ngay_nhac_nho DATE NOT NULL,
    so_km_nhac_nho INTEGER, -- Chỉ dành cho BAO_TRI
    noi_dung TEXT,
    da_nhac BOOLEAN DEFAULT FALSE,
    ngay_gui_nhac TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tm_nhac_nho_ngay ON tm_nhac_nho(ngay_nhac_nho);
CREATE INDEX idx_tm_nhac_nho_status ON tm_nhac_nho(da_nhac) WHERE da_nhac = FALSE;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 043: Maintenance tables and KM tracking added';
END $$;
