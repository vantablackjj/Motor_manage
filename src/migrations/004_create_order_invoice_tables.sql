-- =====================================================
-- MIGRATION 004: CREATE ORDER & INVOICE TABLES
-- Description: Unified order, invoice, and warehouse slip tables
-- Author: Backend Upgrade
-- Date: 2026-01-20
-- =====================================================

-- =====================================================
-- ĐƠN HÀNG (Unified: MUA + BÁN + CHUYỂN KHO)
-- =====================================================
CREATE TABLE IF NOT EXISTS tm_don_hang (
    id SERIAL PRIMARY KEY,
    so_don_hang VARCHAR(50) UNIQUE NOT NULL,
    ngay_dat_hang DATE NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_don_hang' AND column_name='loai_don_hang') THEN
        ALTER TABLE tm_don_hang ADD COLUMN loai_don_hang enum_loai_don_hang NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_don_hang' AND column_name='ma_ben_xuat') THEN
        ALTER TABLE tm_don_hang ADD COLUMN ma_ben_xuat VARCHAR(50) NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_don_hang' AND column_name='loai_ben_xuat') THEN
        ALTER TABLE tm_don_hang ADD COLUMN loai_ben_xuat enum_loai_ben NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_don_hang' AND column_name='ma_ben_nhap') THEN
        ALTER TABLE tm_don_hang ADD COLUMN ma_ben_nhap VARCHAR(50) NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_don_hang' AND column_name='loai_ben_nhap') THEN
        ALTER TABLE tm_don_hang ADD COLUMN loai_ben_nhap enum_loai_ben NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_don_hang' AND column_name='tong_gia_tri') THEN
        ALTER TABLE tm_don_hang ADD COLUMN tong_gia_tri DECIMAL(15,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_don_hang' AND column_name='chiet_khau') THEN
        ALTER TABLE tm_don_hang ADD COLUMN chiet_khau DECIMAL(15,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_don_hang' AND column_name='vat_percentage') THEN
        ALTER TABLE tm_don_hang ADD COLUMN vat_percentage DECIMAL(5,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_don_hang' AND column_name='thanh_tien') THEN
        ALTER TABLE tm_don_hang ADD COLUMN thanh_tien DECIMAL(15,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_don_hang' AND column_name='so_hoa_don_du_kien') THEN
        ALTER TABLE tm_don_hang ADD COLUMN so_hoa_don_du_kien INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_don_hang' AND column_name='so_hoa_don_da_xuat') THEN
        ALTER TABLE tm_don_hang ADD COLUMN so_hoa_don_da_xuat INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_don_hang' AND column_name='trang_thai') THEN
        ALTER TABLE tm_don_hang ADD COLUMN trang_thai enum_trang_thai_don_hang DEFAULT 'NHAP';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_don_hang' AND column_name='nguoi_tao') THEN
        ALTER TABLE tm_don_hang ADD COLUMN nguoi_tao VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_don_hang' AND column_name='ngay_tao') THEN
        ALTER TABLE tm_don_hang ADD COLUMN ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_don_hang' AND column_name='nguoi_duyet') THEN
        ALTER TABLE tm_don_hang ADD COLUMN nguoi_duyet VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_don_hang' AND column_name='ngay_duyet') THEN
        ALTER TABLE tm_don_hang ADD COLUMN ngay_duyet TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_don_hang' AND column_name='ghi_chu') THEN
        ALTER TABLE tm_don_hang ADD COLUMN ghi_chu TEXT;
    END IF;
END $$;

CREATE INDEX idx_tm_don_hang_loai ON tm_don_hang(loai_don_hang);
CREATE INDEX idx_tm_don_hang_trang_thai ON tm_don_hang(trang_thai);
CREATE INDEX idx_tm_don_hang_ngay ON tm_don_hang(ngay_dat_hang DESC);
CREATE INDEX idx_tm_don_hang_ben_xuat ON tm_don_hang(ma_ben_xuat, loai_ben_xuat);
CREATE INDEX idx_tm_don_hang_ben_nhap ON tm_don_hang(ma_ben_nhap, loai_ben_nhap);

COMMENT ON TABLE tm_don_hang IS 'Đơn hàng tổng quát (Mua, Bán, Chuyển kho)';
COMMENT ON COLUMN tm_don_hang.loai_ben_xuat IS 'KHO hoặc DOI_TAC';
COMMENT ON COLUMN tm_don_hang.ma_ben_xuat IS 'ma_kho hoặc ma_doi_tac tùy loai_ben_xuat';

-- =====================================================
-- CHI TIẾT ĐƠN HÀNG
-- =====================================================
CREATE TABLE IF NOT EXISTS tm_don_hang_chi_tiet (
    id SERIAL PRIMARY KEY,
    so_don_hang VARCHAR(50) REFERENCES tm_don_hang(so_don_hang) ON DELETE CASCADE,
    stt INTEGER NOT NULL,
    ma_hang_hoa VARCHAR(50) REFERENCES tm_hang_hoa(ma_hang_hoa) NOT NULL,
    so_luong_dat INTEGER NOT NULL,
    so_luong_da_giao INTEGER DEFAULT 0,
    so_luong_con_lai INTEGER GENERATED ALWAYS AS (so_luong_dat - so_luong_da_giao) STORED,
    don_gia DECIMAL(15,2) NOT NULL,
    thanh_tien DECIMAL(15,2) GENERATED ALWAYS AS (so_luong_dat * don_gia) STORED,
    yeu_cau_dac_biet JSONB DEFAULT '{}', -- Màu sắc, size, phụ kiện
    ghi_chu TEXT,
    
    UNIQUE(so_don_hang, stt)
);

CREATE INDEX idx_tm_don_hang_ct_don_hang ON tm_don_hang_chi_tiet(so_don_hang);
CREATE INDEX idx_tm_don_hang_ct_hang_hoa ON tm_don_hang_chi_tiet(ma_hang_hoa);

COMMENT ON COLUMN tm_don_hang_chi_tiet.yeu_cau_dac_biet IS 'JSONB: {mau_sac: "Đỏ", size: "XL"}';

-- =====================================================
-- HÓA ĐƠN (Mỗi lần giao hàng)
-- =====================================================
CREATE TABLE IF NOT EXISTS tm_hoa_don (
    id SERIAL PRIMARY KEY,
    so_hoa_don VARCHAR(50) UNIQUE NOT NULL,
    loai_hoa_don enum_loai_hoa_don NOT NULL,
    so_don_hang VARCHAR(50) REFERENCES tm_don_hang(so_don_hang), -- NULL nếu không qua đơn
    lan_thu INTEGER DEFAULT 1, -- Lần giao thứ mấy
    ngay_hoa_don DATE NOT NULL,
    
    -- Polymorphic references
    ma_ben_xuat VARCHAR(50) NOT NULL,
    loai_ben_xuat enum_loai_ben NOT NULL,
    ma_ben_nhap VARCHAR(50) NOT NULL,
    loai_ben_nhap enum_loai_ben NOT NULL,
    
    -- Financials
    tong_tien DECIMAL(15,2) DEFAULT 0,
    chiet_khau DECIMAL(15,2) DEFAULT 0,
    tien_thue_gtgt DECIMAL(15,2) DEFAULT 0,
    thanh_tien DECIMAL(15,2) DEFAULT 0,
    
    -- Tax
    da_ke_khai_thue BOOLEAN DEFAULT FALSE,
    ngay_ke_khai DATE,
    
    -- Delivery info
    nguoi_giao VARCHAR(100),
    nguoi_nhan VARCHAR(100),
    phuong_tien VARCHAR(100),
    thoi_gian_giao TIMESTAMP,
    
    -- Link to warehouse slip
    so_phieu_kho VARCHAR(50),
    
    -- Status
    trang_thai enum_trang_thai_hoa_don DEFAULT 'NHAP',
    
    -- Audit
    nguoi_lap VARCHAR(100),
    ngay_lap TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ghi_chu TEXT
);

CREATE INDEX idx_tm_hoa_don_loai ON tm_hoa_don(loai_hoa_don);
CREATE INDEX idx_tm_hoa_don_don_hang ON tm_hoa_don(so_don_hang);
CREATE INDEX idx_tm_hoa_don_trang_thai ON tm_hoa_don(trang_thai);
CREATE INDEX idx_tm_hoa_don_ngay ON tm_hoa_don(ngay_hoa_don DESC);

COMMENT ON TABLE tm_hoa_don IS 'Hóa đơn (mỗi lần giao hàng từ đơn hàng)';

-- =====================================================
-- CHI TIẾT HÓA ĐƠN
-- =====================================================
CREATE TABLE IF NOT EXISTS tm_hoa_don_chi_tiet (
    id SERIAL PRIMARY KEY,
    so_hoa_don VARCHAR(50) REFERENCES tm_hoa_don(so_hoa_don) ON DELETE CASCADE,
    stt INTEGER NOT NULL,
    ma_hang_hoa VARCHAR(50) REFERENCES tm_hang_hoa(ma_hang_hoa) NOT NULL,
    ma_serial VARCHAR(100) REFERENCES tm_hang_hoa_serial(ma_serial), -- NULL nếu BATCH
    so_luong INTEGER NOT NULL,
    so_luong_nhan INTEGER DEFAULT 0, -- Thực nhận
    so_luong_loi INTEGER DEFAULT 0,
    don_gia DECIMAL(15,2) NOT NULL,
    thanh_tien DECIMAL(15,2) GENERATED ALWAYS AS (so_luong * don_gia) STORED,
    thue_suat DECIMAL(5,2) DEFAULT 0,
    tien_thue DECIMAL(15,2) GENERATED ALWAYS AS (so_luong * don_gia * thue_suat / 100) STORED,
    thong_tin_giao_hang JSONB DEFAULT '{}',
    ghi_chu TEXT,
    
    UNIQUE(so_hoa_don, stt)
);

CREATE INDEX idx_tm_hoa_don_ct_hoa_don ON tm_hoa_don_chi_tiet(so_hoa_don);
CREATE INDEX idx_tm_hoa_don_ct_hang_hoa ON tm_hoa_don_chi_tiet(ma_hang_hoa);
CREATE INDEX idx_tm_hoa_don_ct_serial ON tm_hoa_don_chi_tiet(ma_serial);

COMMENT ON TABLE tm_hoa_don_chi_tiet IS 'Chi tiết hóa đơn (hàng hóa thực tế giao)';

-- =====================================================
-- PHIẾU KHO (Audit log)
-- =====================================================
CREATE TABLE IF NOT EXISTS tm_phieu_kho (
    id SERIAL PRIMARY KEY,
    so_phieu VARCHAR(50) UNIQUE NOT NULL,
    ngay_phieu TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    loai_phieu enum_loai_phieu_kho NOT NULL,
    ma_kho VARCHAR(50) REFERENCES sys_kho(ma_kho) NOT NULL,
    so_don_hang VARCHAR(50) REFERENCES tm_don_hang(so_don_hang), -- NULL nếu thủ công
    so_hoa_don VARCHAR(50) REFERENCES tm_hoa_don(so_hoa_don), -- NULL nếu thủ công
    nguoi_lap VARCHAR(100),
    tong_gia_tri DECIMAL(15,2) DEFAULT 0,
    trang_thai enum_trang_thai_phieu_kho DEFAULT 'NHAP',
    dien_giai TEXT,
    ghi_chu TEXT,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tm_phieu_kho_loai ON tm_phieu_kho(loai_phieu);
CREATE INDEX idx_tm_phieu_kho_kho ON tm_phieu_kho(ma_kho);
CREATE INDEX idx_tm_phieu_kho_don_hang ON tm_phieu_kho(so_don_hang);
CREATE INDEX idx_tm_phieu_kho_hoa_don ON tm_phieu_kho(so_hoa_don);
CREATE INDEX idx_tm_phieu_kho_ngay ON tm_phieu_kho(ngay_phieu DESC);

COMMENT ON TABLE tm_phieu_kho IS 'Phiếu kho (audit log cho mọi giao dịch kho)';

-- =====================================================
-- CHI TIẾT PHIẾU KHO
-- =====================================================
CREATE TABLE IF NOT EXISTS tm_phieu_kho_chi_tiet (
    id SERIAL PRIMARY KEY,
    so_phieu VARCHAR(50) REFERENCES tm_phieu_kho(so_phieu) ON DELETE CASCADE,
    stt INTEGER NOT NULL,
    ma_hang_hoa VARCHAR(50) REFERENCES tm_hang_hoa(ma_hang_hoa) NOT NULL,
    ma_serial VARCHAR(100) REFERENCES tm_hang_hoa_serial(ma_serial), -- NULL nếu BATCH
    so_luong INTEGER NOT NULL,
    don_gia DECIMAL(15,2) NOT NULL,
    thanh_tien DECIMAL(15,2) GENERATED ALWAYS AS (so_luong * don_gia) STORED,
    thong_tin_kiem_ke JSONB DEFAULT '{}',
    ghi_chu TEXT,
    
    UNIQUE(so_phieu, stt)
);

CREATE INDEX idx_tm_phieu_kho_ct_phieu ON tm_phieu_kho_chi_tiet(so_phieu);
CREATE INDEX idx_tm_phieu_kho_ct_hang_hoa ON tm_phieu_kho_chi_tiet(ma_hang_hoa);
CREATE INDEX idx_tm_phieu_kho_ct_serial ON tm_phieu_kho_chi_tiet(ma_serial);

COMMENT ON TABLE tm_phieu_kho_chi_tiet IS 'Chi tiết phiếu kho';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 004: Order & Invoice tables created successfully';
END $$;
