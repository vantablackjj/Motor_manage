-- =====================================================
-- MIGRATION 002: CREATE MASTER DATA TABLES
-- Description: Create enhanced master data tables
-- Author: Backend Upgrade
-- Date: 2026-01-20
-- =====================================================

-- =====================================================
-- ĐỐI TÁC (Merge Khách hàng + Nhà cung cấp)
-- =====================================================
CREATE TABLE IF NOT EXISTS dm_doi_tac (
    id SERIAL PRIMARY KEY,
    ma_doi_tac VARCHAR(50) UNIQUE NOT NULL,
    ten_doi_tac VARCHAR(255) NOT NULL,
    loai_doi_tac enum_loai_doi_tac NOT NULL DEFAULT 'KHACH_HANG',
    ma_so_thue VARCHAR(50),
    dia_chi TEXT,
    dien_thoai VARCHAR(20),
    email VARCHAR(100),
    so_cmnd VARCHAR(20),
    ngay_sinh DATE,
    ho_khau TEXT,
    dai_dien VARCHAR(255),
    tai_khoan VARCHAR(50),
    ngan_hang VARCHAR(100),
    status BOOLEAN DEFAULT TRUE,
    ghi_chu TEXT,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dm_doi_tac_loai ON dm_doi_tac(loai_doi_tac);
CREATE INDEX idx_dm_doi_tac_status ON dm_doi_tac(status);
CREATE INDEX idx_dm_doi_tac_search ON dm_doi_tac(ten_doi_tac, dien_thoai);

COMMENT ON TABLE dm_doi_tac IS 'Danh mục đối tác (Khách hàng + Nhà cung cấp)';
COMMENT ON COLUMN dm_doi_tac.loai_doi_tac IS 'KHACH_HANG | NHA_CUNG_CAP | CA_HAI';

-- =====================================================
-- NHÓM HÀNG (Hierarchical)
-- =====================================================
CREATE TABLE IF NOT EXISTS dm_nhom_hang (
    id SERIAL PRIMARY KEY,
    ma_nhom VARCHAR(50) UNIQUE NOT NULL,
    ten_nhom VARCHAR(255) NOT NULL,
    ma_nhom_cha VARCHAR(50) REFERENCES dm_nhom_hang(ma_nhom),
    thong_so_bat_buoc JSONB DEFAULT '{}',
    thu_tu_hien_thi INTEGER DEFAULT 0,
    status BOOLEAN DEFAULT TRUE,
    ghi_chu TEXT,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dm_nhom_hang_cha ON dm_nhom_hang(ma_nhom_cha);
CREATE INDEX idx_dm_nhom_hang_status ON dm_nhom_hang(status);

COMMENT ON TABLE dm_nhom_hang IS 'Nhóm hàng hóa phân cấp (Xe, Phụ tùng, Laptop, v.v.)';
COMMENT ON COLUMN dm_nhom_hang.thong_so_bat_buoc IS 'JSONB: {so_khung: true, size: false, ...}';

-- =====================================================
-- KHO (Hierarchical - Enhanced)
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_kho_new (
    id SERIAL PRIMARY KEY,
    ma_kho VARCHAR(50) UNIQUE NOT NULL,
    ten_kho VARCHAR(255) NOT NULL,
    ma_kho_cha VARCHAR(50) REFERENCES sys_kho_new(ma_kho),
    dia_chi TEXT,
    dien_thoai VARCHAR(20),
    mac_dinh BOOLEAN DEFAULT FALSE,
    chinh BOOLEAN DEFAULT FALSE,
    daily BOOLEAN DEFAULT FALSE,
    thong_tin_them JSONB DEFAULT '{}',
    status BOOLEAN DEFAULT TRUE,
    ghi_chu TEXT,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sys_kho_new_cha ON sys_kho_new(ma_kho_cha);
CREATE INDEX idx_sys_kho_new_chinh ON sys_kho_new(chinh);
CREATE INDEX idx_sys_kho_new_status ON sys_kho_new(status);

COMMENT ON TABLE sys_kho_new IS 'Kho phân cấp (kho cha - kho con)';
COMMENT ON COLUMN sys_kho_new.thong_tin_them IS 'JSONB: {capacity: 1000, nhiet_do: -5, ...}';

-- =====================================================
-- HÀNG HÓA - CATALOG (Unified)
-- =====================================================
CREATE TABLE IF NOT EXISTS tm_hang_hoa (
    id SERIAL PRIMARY KEY,
    ma_hang_hoa VARCHAR(50) UNIQUE NOT NULL,
    ten_hang_hoa VARCHAR(255) NOT NULL,
    ma_nhom_hang VARCHAR(50) REFERENCES dm_nhom_hang(ma_nhom),
    loai_quan_ly enum_loai_quan_ly NOT NULL DEFAULT 'BATCH',
    gia_ban_mac_dinh DECIMAL(15,2) DEFAULT 0,
    gia_von_mac_dinh DECIMAL(15,2) DEFAULT 0,
    don_vi_tinh VARCHAR(20),
    mo_ta TEXT,
    thong_so_ky_thuat JSONB DEFAULT '{}',
    status BOOLEAN DEFAULT TRUE,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tm_hang_hoa_nhom ON tm_hang_hoa(ma_nhom_hang);
CREATE INDEX idx_tm_hang_hoa_loai ON tm_hang_hoa(loai_quan_ly);
CREATE INDEX idx_tm_hang_hoa_status ON tm_hang_hoa(status);
CREATE INDEX idx_tm_hang_hoa_search ON tm_hang_hoa(ten_hang_hoa);

COMMENT ON TABLE tm_hang_hoa IS 'Catalog hàng hóa tổng quát (Xe, Phụ tùng, Laptop, ...)';
COMMENT ON COLUMN tm_hang_hoa.loai_quan_ly IS 'SERIAL: tracking từng unit | BATCH: tracking theo lô';
COMMENT ON COLUMN tm_hang_hoa.thong_so_ky_thuat IS 'JSONB: Thuộc tính chung của sản phẩm';

-- =====================================================
-- USER & ROLE (Enhanced)
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_role (
    id SERIAL PRIMARY KEY,
    ten_quyen VARCHAR(50) UNIQUE NOT NULL,
    mo_ta TEXT,
    permissions JSONB DEFAULT '{}',
    status BOOLEAN DEFAULT TRUE,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sys_role_status ON sys_role(status);

COMMENT ON TABLE sys_role IS 'Vai trò và phân quyền';
COMMENT ON COLUMN sys_role.permissions IS 'JSONB: {view_gia_von: false, edit_don_hang: true, ...}';

-- Enhance existing sys_user table
ALTER TABLE sys_user ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES sys_role(id);
ALTER TABLE sys_user ADD COLUMN IF NOT EXISTS ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- =====================================================
-- AUDIT LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS sys_audit_log (
    id SERIAL PRIMARY KEY,
    thoi_gian TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES sys_user(id),
    hanh_dong VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    ten_bang VARCHAR(100) NOT NULL,
    ban_ghi_id VARCHAR(100),
    du_lieu_cu JSONB,
    du_lieu_moi JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT
);

CREATE INDEX idx_sys_audit_log_user ON sys_audit_log(user_id);
CREATE INDEX idx_sys_audit_log_time ON sys_audit_log(thoi_gian DESC);
CREATE INDEX idx_sys_audit_log_table ON sys_audit_log(ten_bang);

COMMENT ON TABLE sys_audit_log IS 'Nhật ký truy vết hệ thống';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 002: Master data tables created successfully';
END $$;
