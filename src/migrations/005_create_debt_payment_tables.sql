-- =====================================================
-- MIGRATION 005: CREATE DEBT & PAYMENT TABLES
-- Description: Debt management and payment tracking
-- Author: Backend Upgrade
-- Date: 2026-01-20
-- =====================================================

-- =====================================================
-- CÔNG NỢ ĐỐI TÁC (Summary)
-- =====================================================
CREATE TABLE IF NOT EXISTS tm_cong_no_doi_tac (
    id SERIAL PRIMARY KEY,
    ma_doi_tac VARCHAR(50) REFERENCES dm_doi_tac(ma_doi_tac) NOT NULL,
    loai_cong_no enum_loai_cong_no NOT NULL,
    tong_no DECIMAL(15,2) DEFAULT 0,
    tong_da_thanh_toan DECIMAL(15,2) DEFAULT 0,
    con_lai DECIMAL(15,2) GENERATED ALWAYS AS (tong_no - tong_da_thanh_toan) STORED,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(ma_doi_tac, loai_cong_no)
);

CREATE INDEX idx_tm_cong_no_dt_doi_tac ON tm_cong_no_doi_tac(ma_doi_tac);
CREATE INDEX idx_tm_cong_no_dt_loai ON tm_cong_no_doi_tac(loai_cong_no);

COMMENT ON TABLE tm_cong_no_doi_tac IS 'Tổng hợp công nợ đối tác';

-- =====================================================
-- CÔNG NỢ ĐỐI TÁC CHI TIẾT
-- =====================================================
CREATE TABLE IF NOT EXISTS tm_cong_no_doi_tac_ct (
    id SERIAL PRIMARY KEY,
    ma_doi_tac VARCHAR(50) REFERENCES dm_doi_tac(ma_doi_tac) NOT NULL,
    loai_cong_no enum_loai_cong_no NOT NULL,
    so_hoa_don VARCHAR(50) REFERENCES tm_hoa_don(so_hoa_don),
    ngay_phat_sinh DATE NOT NULL,
    so_tien DECIMAL(15,2) NOT NULL,
    da_thanh_toan DECIMAL(15,2) DEFAULT 0,
    con_lai DECIMAL(15,2) GENERATED ALWAYS AS (so_tien - da_thanh_toan) STORED,
    han_thanh_toan DATE,
    trang_thai enum_trang_thai_cong_no DEFAULT 'CHUA_TT',
    ghi_chu TEXT,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tm_cong_no_dt_ct_doi_tac ON tm_cong_no_doi_tac_ct(ma_doi_tac);
CREATE INDEX idx_tm_cong_no_dt_ct_hoa_don ON tm_cong_no_doi_tac_ct(so_hoa_don);
CREATE INDEX idx_tm_cong_no_dt_ct_trang_thai ON tm_cong_no_doi_tac_ct(trang_thai);
CREATE INDEX idx_tm_cong_no_dt_ct_han ON tm_cong_no_doi_tac_ct(han_thanh_toan) WHERE trang_thai != 'DA_TT';

COMMENT ON TABLE tm_cong_no_doi_tac_ct IS 'Chi tiết công nợ đối tác';

-- =====================================================
-- CÔNG NỢ NỘI BỘ (Kho ↔ Kho) - Summary
-- =====================================================
CREATE TABLE IF NOT EXISTS tm_cong_no_noi_bo (
    id SERIAL PRIMARY KEY,
    ma_kho_no VARCHAR(50) REFERENCES sys_kho(ma_kho) NOT NULL, -- Kho nợ (nhận hàng)
    ma_kho_co VARCHAR(50) REFERENCES sys_kho(ma_kho) NOT NULL, -- Kho có (xuất hàng)
    tong_no DECIMAL(15,2) DEFAULT 0,
    tong_da_tra DECIMAL(15,2) DEFAULT 0,
    con_lai DECIMAL(15,2) GENERATED ALWAYS AS (tong_no - tong_da_tra) STORED,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(ma_kho_no, ma_kho_co)
);

CREATE INDEX idx_tm_cong_no_nb_kho_no ON tm_cong_no_noi_bo(ma_kho_no);
CREATE INDEX idx_tm_cong_no_nb_kho_co ON tm_cong_no_noi_bo(ma_kho_co);

COMMENT ON TABLE tm_cong_no_noi_bo IS 'Tổng hợp công nợ nội bộ giữa các kho';

-- =====================================================
-- CÔNG NỢ NỘI BỘ CHI TIẾT
-- =====================================================
CREATE TABLE IF NOT EXISTS tm_cong_no_noi_bo_ct (
    id SERIAL PRIMARY KEY,
    ma_kho_no VARCHAR(50) REFERENCES sys_kho(ma_kho) NOT NULL,
    ma_kho_co VARCHAR(50) REFERENCES sys_kho(ma_kho) NOT NULL,
    so_phieu_chuyen_kho VARCHAR(50), -- Link to tm_don_hang (loai = CHUYEN_KHO)
    ngay_phat_sinh DATE NOT NULL,
    so_tien DECIMAL(15,2) NOT NULL, -- Theo giá vốn
    da_thanh_toan DECIMAL(15,2) DEFAULT 0,
    con_lai DECIMAL(15,2) GENERATED ALWAYS AS (so_tien - da_thanh_toan) STORED,
    han_thanh_toan DATE,
    trang_thai enum_trang_thai_cong_no DEFAULT 'CHUA_TT',
    ghi_chu TEXT,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tm_cong_no_nb_ct_kho_no ON tm_cong_no_noi_bo_ct(ma_kho_no);
CREATE INDEX idx_tm_cong_no_nb_ct_kho_co ON tm_cong_no_noi_bo_ct(ma_kho_co);
CREATE INDEX idx_tm_cong_no_nb_ct_phieu ON tm_cong_no_noi_bo_ct(so_phieu_chuyen_kho);

COMMENT ON TABLE tm_cong_no_noi_bo_ct IS 'Chi tiết công nợ nội bộ';

-- =====================================================
-- PHIẾU THU CHI
-- =====================================================
CREATE TABLE IF NOT EXISTS tm_phieu_thu_chi (
    id SERIAL PRIMARY KEY,
    so_phieu_tc VARCHAR(50) UNIQUE NOT NULL,
    loai_phieu enum_loai_phieu_thu_chi NOT NULL,
    so_tien DECIMAL(15,2) NOT NULL,
    hinh_thuc enum_hinh_thuc_thanh_toan NOT NULL,
    ma_hoa_don VARCHAR(50) REFERENCES tm_hoa_don(so_hoa_don), -- Link để trừ nợ
    ma_doi_tac VARCHAR(50) REFERENCES dm_doi_tac(ma_doi_tac),
    ma_kho VARCHAR(50) REFERENCES sys_kho(ma_kho),
    ngay_giao_dich TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    noi_dung TEXT,
    nguoi_lap VARCHAR(100),
    nguoi_nhan VARCHAR(100), -- Người nhận tiền (nếu CHI)
    nguoi_nop VARCHAR(100), -- Người nộp tiền (nếu THU)
    ghi_chu TEXT,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tm_phieu_tc_loai ON tm_phieu_thu_chi(loai_phieu);
CREATE INDEX idx_tm_phieu_tc_hoa_don ON tm_phieu_thu_chi(ma_hoa_don);
CREATE INDEX idx_tm_phieu_tc_doi_tac ON tm_phieu_thu_chi(ma_doi_tac);
CREATE INDEX idx_tm_phieu_tc_ngay ON tm_phieu_thu_chi(ngay_giao_dich DESC);

COMMENT ON TABLE tm_phieu_thu_chi IS 'Phiếu thu chi (thanh toán công nợ)';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 005: Debt & Payment tables created successfully';
END $$;
