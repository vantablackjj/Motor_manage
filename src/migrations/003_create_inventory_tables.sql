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
    serial_identifier VARCHAR(100) NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_serial' AND column_name='ma_kho_hien_tai') THEN
        ALTER TABLE tm_hang_hoa_serial ADD COLUMN ma_kho_hien_tai VARCHAR(50) REFERENCES sys_kho(ma_kho);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_serial' AND column_name='trang_thai') THEN
        ALTER TABLE tm_hang_hoa_serial ADD COLUMN trang_thai enum_trang_thai_serial DEFAULT 'TON_KHO';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_serial' AND column_name='locked') THEN
        ALTER TABLE tm_hang_hoa_serial ADD COLUMN locked BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_serial' AND column_name='locked_reason') THEN
        ALTER TABLE tm_hang_hoa_serial ADD COLUMN locked_reason VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_serial' AND column_name='locked_at') THEN
        ALTER TABLE tm_hang_hoa_serial ADD COLUMN locked_at TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_serial' AND column_name='gia_von') THEN
        ALTER TABLE tm_hang_hoa_serial ADD COLUMN gia_von DECIMAL(15,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_serial' AND column_name='thuoc_tinh_rieng') THEN
        ALTER TABLE tm_hang_hoa_serial ADD COLUMN thuoc_tinh_rieng JSONB DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_serial' AND column_name='ngay_nhap_kho') THEN
        ALTER TABLE tm_hang_hoa_serial ADD COLUMN ngay_nhap_kho TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_serial' AND column_name='ghi_chu') THEN
        ALTER TABLE tm_hang_hoa_serial ADD COLUMN ghi_chu TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_serial' AND column_name='ngay_tao') THEN
        ALTER TABLE tm_hang_hoa_serial ADD COLUMN ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_serial' AND column_name='ngay_cap_nhat') THEN
        ALTER TABLE tm_hang_hoa_serial ADD COLUMN ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

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
    UNIQUE(ma_hang_hoa, ma_kho)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_ton_kho' AND column_name='so_luong_ton') THEN
        ALTER TABLE tm_hang_hoa_ton_kho ADD COLUMN so_luong_ton INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_ton_kho' AND column_name='so_luong_khoa') THEN
        ALTER TABLE tm_hang_hoa_ton_kho ADD COLUMN so_luong_khoa INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_ton_kho' AND column_name='so_luong_toi_thieu') THEN
        ALTER TABLE tm_hang_hoa_ton_kho ADD COLUMN so_luong_toi_thieu INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_ton_kho' AND column_name='gia_von_binh_quan') THEN
        ALTER TABLE tm_hang_hoa_ton_kho ADD COLUMN gia_von_binh_quan DECIMAL(15,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_ton_kho' AND column_name='cap_nhat_cuoi') THEN
        ALTER TABLE tm_hang_hoa_ton_kho ADD COLUMN cap_nhat_cuoi TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

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
    so_phieu VARCHAR(50) NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_khoa' AND column_name='loai_phieu') THEN
        ALTER TABLE tm_hang_hoa_khoa ADD COLUMN loai_phieu VARCHAR(50) NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_khoa' AND column_name='so_luong_khoa') THEN
        ALTER TABLE tm_hang_hoa_khoa ADD COLUMN so_luong_khoa INTEGER NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_khoa' AND column_name='ly_do') THEN
        ALTER TABLE tm_hang_hoa_khoa ADD COLUMN ly_do TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_khoa' AND column_name='ngay_khoa') THEN
        ALTER TABLE tm_hang_hoa_khoa ADD COLUMN ngay_khoa TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

CREATE INDEX idx_tm_hang_hoa_khoa_phieu ON tm_hang_hoa_khoa(so_phieu);
CREATE INDEX idx_tm_hang_hoa_khoa_hang_kho ON tm_hang_hoa_khoa(ma_hang_hoa, ma_kho);

COMMENT ON TABLE tm_hang_hoa_khoa IS 'Tracking khóa tồn kho batch (tương tự tm_phu_tung_khoa cũ)';

-- =====================================================
-- LỊCH SỬ HÀNG HÓA (Unified)
-- =====================================================
CREATE TABLE IF NOT EXISTS tm_hang_hoa_lich_su (
    id SERIAL PRIMARY KEY,
    ma_hang_hoa VARCHAR(50) REFERENCES tm_hang_hoa(ma_hang_hoa)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_lich_su' AND column_name='ma_serial') THEN
        ALTER TABLE tm_hang_hoa_lich_su ADD COLUMN ma_serial VARCHAR(100) REFERENCES tm_hang_hoa_serial(ma_serial);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_lich_su' AND column_name='loai_giao_dich') THEN
        ALTER TABLE tm_hang_hoa_lich_su ADD COLUMN loai_giao_dich VARCHAR(50) NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_lich_su' AND column_name='so_chung_tu') THEN
        ALTER TABLE tm_hang_hoa_lich_su ADD COLUMN so_chung_tu VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_lich_su' AND column_name='ngay_giao_dich') THEN
        ALTER TABLE tm_hang_hoa_lich_su ADD COLUMN ngay_giao_dich TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_lich_su' AND column_name='ma_kho_xuat') THEN
        ALTER TABLE tm_hang_hoa_lich_su ADD COLUMN ma_kho_xuat VARCHAR(50) REFERENCES sys_kho(ma_kho);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_lich_su' AND column_name='ma_kho_nhap') THEN
        ALTER TABLE tm_hang_hoa_lich_su ADD COLUMN ma_kho_nhap VARCHAR(50) REFERENCES sys_kho(ma_kho);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_lich_su' AND column_name='so_luong') THEN
        ALTER TABLE tm_hang_hoa_lich_su ADD COLUMN so_luong INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_lich_su' AND column_name='don_gia') THEN
        ALTER TABLE tm_hang_hoa_lich_su ADD COLUMN don_gia DECIMAL(15,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_lich_su' AND column_name='thanh_tien') THEN
        ALTER TABLE tm_hang_hoa_lich_su ADD COLUMN thanh_tien DECIMAL(15,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_lich_su' AND column_name='nguoi_thuc_hien') THEN
        ALTER TABLE tm_hang_hoa_lich_su ADD COLUMN nguoi_thuc_hien VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_hang_hoa_lich_su' AND column_name='dien_giai') THEN
        ALTER TABLE tm_hang_hoa_lich_su ADD COLUMN dien_giai TEXT;
    END IF;
END $$;

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
