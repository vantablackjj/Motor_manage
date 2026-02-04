-- =====================================================
-- MIGRATION 003: CREATE INVENTORY TABLES
-- Description: Serial tracking & Batch inventory tables
-- Author: Backend Upgrade
-- Date: 2026-01-20
-- =====================================================

-- =====================================================
-- SERIAL TRACKING (Xe, Laptop, Điện thoại, ...)
-- =====================================================
CREATE TABLE IF NOT EXISTS tm_hang_hoa_serial (
    id SERIAL PRIMARY KEY,
    ma_serial VARCHAR(100) UNIQUE NOT NULL,
    ma_hang_hoa VARCHAR(50) REFERENCES tm_hang_hoa(ma_hang_hoa) NOT NULL,
    serial_identifier VARCHAR(100) NOT NULL, -- Số khung, IMEI, Serial number
    ma_kho_hien_tai VARCHAR(50) REFERENCES sys_kho(ma_kho),
    trang_thai enum_trang_thai_serial DEFAULT 'TON_KHO',
    locked BOOLEAN DEFAULT FALSE,
    locked_reason VARCHAR(100),
    locked_at TIMESTAMP,
    gia_von DECIMAL(15,2), -- Giá vốn riêng của serial này
    thuoc_tinh_rieng JSONB DEFAULT '{}', -- Màu sắc, size, phiên bản cụ thể
    ngay_nhap_kho TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ghi_chu TEXT,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tm_hang_hoa_serial_ma_hang ON tm_hang_hoa_serial(ma_hang_hoa);
CREATE INDEX idx_tm_hang_hoa_serial_kho ON tm_hang_hoa_serial(ma_kho_hien_tai);
CREATE INDEX idx_tm_hang_hoa_serial_trang_thai ON tm_hang_hoa_serial(trang_thai);
CREATE INDEX idx_tm_hang_hoa_serial_locked ON tm_hang_hoa_serial(locked) WHERE locked = TRUE;
CREATE INDEX idx_tm_hang_hoa_serial_identifier ON tm_hang_hoa_serial(serial_identifier);

COMMENT ON TABLE tm_hang_hoa_serial IS 'Tracking serial cho hàng hóa quản lý theo unit';
COMMENT ON COLUMN tm_hang_hoa_serial.serial_identifier IS 'Số khung (xe), IMEI (điện thoại), Serial (laptop)';
COMMENT ON COLUMN tm_hang_hoa_serial.thuoc_tinh_rieng IS 'JSONB: {mau_sac: "Đỏ", size: "XL", ram: "16GB"}';

-- =====================================================
-- TỒN KHO BATCH (Phụ tùng, vật tư, ...)
-- =====================================================
CREATE TABLE IF NOT EXISTS tm_hang_hoa_ton_kho (
    id SERIAL PRIMARY KEY,
    ma_hang_hoa VARCHAR(50) REFERENCES tm_hang_hoa(ma_hang_hoa) NOT NULL,
    ma_kho VARCHAR(50) REFERENCES sys_kho(ma_kho) NOT NULL,
    so_luong_ton INTEGER DEFAULT 0,
    so_luong_khoa INTEGER DEFAULT 0, -- Số lượng đang bị khóa (chờ xuất)
    so_luong_toi_thieu INTEGER DEFAULT 0, -- Cảnh báo tồn kho
    gia_von_binh_quan DECIMAL(15,2) DEFAULT 0, -- Weighted average cost
    cap_nhat_cuoi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(ma_hang_hoa, ma_kho)
);

CREATE INDEX idx_tm_hang_hoa_ton_kho_hang ON tm_hang_hoa_ton_kho(ma_hang_hoa);
CREATE INDEX idx_tm_hang_hoa_ton_kho_kho ON tm_hang_hoa_ton_kho(ma_kho);
CREATE INDEX idx_tm_hang_hoa_ton_kho_low_stock ON tm_hang_hoa_ton_kho(ma_hang_hoa, ma_kho) 
    WHERE (so_luong_ton - so_luong_khoa) <= so_luong_toi_thieu;

COMMENT ON TABLE tm_hang_hoa_ton_kho IS 'Tồn kho cho hàng hóa quản lý theo lô';
COMMENT ON COLUMN tm_hang_hoa_ton_kho.so_luong_khoa IS 'Số lượng đang bị khóa (đơn hàng chưa xuất)';
COMMENT ON COLUMN tm_hang_hoa_ton_kho.gia_von_binh_quan IS 'Giá vốn bình quân gia quyền';

-- =====================================================
-- KHÓA TỒN KHO (Batch)
-- =====================================================
CREATE TABLE IF NOT EXISTS tm_hang_hoa_khoa (
    id SERIAL PRIMARY KEY,
    ma_hang_hoa VARCHAR(50) REFERENCES tm_hang_hoa(ma_hang_hoa) NOT NULL,
    ma_kho VARCHAR(50) REFERENCES sys_kho(ma_kho) NOT NULL,
    so_phieu VARCHAR(50) NOT NULL, -- Số đơn hàng/phiếu chuyển kho
    loai_phieu VARCHAR(50) NOT NULL, -- DON_HANG, CHUYEN_KHO
    so_luong_khoa INTEGER NOT NULL,
    ly_do TEXT,
    ngay_khoa TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tm_hang_hoa_khoa_phieu ON tm_hang_hoa_khoa(so_phieu);
CREATE INDEX idx_tm_hang_hoa_khoa_hang_kho ON tm_hang_hoa_khoa(ma_hang_hoa, ma_kho);

COMMENT ON TABLE tm_hang_hoa_khoa IS 'Tracking khóa tồn kho batch (tương tự tm_phu_tung_khoa cũ)';

-- =====================================================
-- LỊCH SỬ HÀNG HÓA (Unified)
-- =====================================================
CREATE TABLE IF NOT EXISTS tm_hang_hoa_lich_su (
    id SERIAL PRIMARY KEY,
    ma_hang_hoa VARCHAR(50) REFERENCES tm_hang_hoa(ma_hang_hoa),
    ma_serial VARCHAR(100) REFERENCES tm_hang_hoa_serial(ma_serial), -- NULL nếu BATCH
    loai_giao_dich VARCHAR(50) NOT NULL, -- NHAP, XUAT, CHUYEN_KHO, BAN, MUA
    so_chung_tu VARCHAR(50),
    ngay_giao_dich TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ma_kho_xuat VARCHAR(50) REFERENCES sys_kho(ma_kho),
    ma_kho_nhap VARCHAR(50) REFERENCES sys_kho(ma_kho),
    so_luong INTEGER DEFAULT 1, -- 1 cho SERIAL, N cho BATCH
    don_gia DECIMAL(15,2),
    thanh_tien DECIMAL(15,2),
    nguoi_thuc_hien VARCHAR(100),
    dien_giai TEXT
);

CREATE INDEX idx_tm_hang_hoa_lich_su_hang ON tm_hang_hoa_lich_su(ma_hang_hoa);
CREATE INDEX idx_tm_hang_hoa_lich_su_serial ON tm_hang_hoa_lich_su(ma_serial);
CREATE INDEX idx_tm_hang_hoa_lich_su_ngay ON tm_hang_hoa_lich_su(ngay_giao_dich DESC);
CREATE INDEX idx_tm_hang_hoa_lich_su_chung_tu ON tm_hang_hoa_lich_su(so_chung_tu);

COMMENT ON TABLE tm_hang_hoa_lich_su IS 'Lịch sử giao dịch hàng hóa (thay thế tm_xe_lich_su và tm_phu_tung_lich_su)';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 003: Inventory tables created successfully';
END $$;
