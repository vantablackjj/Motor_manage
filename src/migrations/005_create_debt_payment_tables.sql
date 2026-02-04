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
    UNIQUE(ma_doi_tac, loai_cong_no)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_doi_tac' AND column_name='loai_cong_no') THEN
        ALTER TABLE tm_cong_no_doi_tac ADD COLUMN loai_cong_no enum_loai_cong_no NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_doi_tac' AND column_name='tong_no') THEN
        ALTER TABLE tm_cong_no_doi_tac ADD COLUMN tong_no DECIMAL(15,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_doi_tac' AND column_name='tong_da_thanh_toan') THEN
        ALTER TABLE tm_cong_no_doi_tac ADD COLUMN tong_da_thanh_toan DECIMAL(15,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_doi_tac' AND column_name='con_lai') THEN
        ALTER TABLE tm_cong_no_doi_tac ADD COLUMN con_lai DECIMAL(15,2) GENERATED ALWAYS AS (tong_no - tong_da_thanh_toan) STORED;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_doi_tac' AND column_name='ngay_cap_nhat') THEN
        ALTER TABLE tm_cong_no_doi_tac ADD COLUMN ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

CREATE INDEX idx_tm_cong_no_dt_doi_tac ON tm_cong_no_doi_tac(ma_doi_tac);
CREATE INDEX idx_tm_cong_no_dt_loai ON tm_cong_no_doi_tac(loai_cong_no);

COMMENT ON TABLE tm_cong_no_doi_tac IS 'Tổng hợp công nợ đối tác';

-- =====================================================
-- CÔNG NỢ ĐỐI TÁC CHI TIẾT
-- =====================================================
CREATE TABLE IF NOT EXISTS tm_cong_no_doi_tac_ct (
    id SERIAL PRIMARY KEY,
    ma_doi_tac VARCHAR(50) REFERENCES dm_doi_tac(ma_doi_tac) NOT NULL,
    so_hoa_don VARCHAR(50) REFERENCES tm_hoa_don(so_hoa_don),
    ngay_phat_sinh DATE NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_doi_tac_ct' AND column_name='loai_cong_no') THEN
        ALTER TABLE tm_cong_no_doi_tac_ct ADD COLUMN loai_cong_no enum_loai_cong_no NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_doi_tac_ct' AND column_name='so_tien') THEN
        ALTER TABLE tm_cong_no_doi_tac_ct ADD COLUMN so_tien DECIMAL(15,2) NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_doi_tac_ct' AND column_name='da_thanh_toan') THEN
        ALTER TABLE tm_cong_no_doi_tac_ct ADD COLUMN da_thanh_toan DECIMAL(15,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_doi_tac_ct' AND column_name='con_lai') THEN
        ALTER TABLE tm_cong_no_doi_tac_ct ADD COLUMN con_lai DECIMAL(15,2) GENERATED ALWAYS AS (so_tien - da_thanh_toan) STORED;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_doi_tac_ct' AND column_name='han_thanh_toan') THEN
        ALTER TABLE tm_cong_no_doi_tac_ct ADD COLUMN han_thanh_toan DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_doi_tac_ct' AND column_name='trang_thai') THEN
        ALTER TABLE tm_cong_no_doi_tac_ct ADD COLUMN trang_thai enum_trang_thai_cong_no DEFAULT 'CHUA_TT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_doi_tac_ct' AND column_name='ghi_chu') THEN
        ALTER TABLE tm_cong_no_doi_tac_ct ADD COLUMN ghi_chu TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_doi_tac_ct' AND column_name='ngay_tao') THEN
        ALTER TABLE tm_cong_no_doi_tac_ct ADD COLUMN ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

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
    ma_kho_no VARCHAR(50) REFERENCES sys_kho(ma_kho) NOT NULL,
    ma_kho_co VARCHAR(50) REFERENCES sys_kho(ma_kho) NOT NULL,
    UNIQUE(ma_kho_no, ma_kho_co)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_noi_bo' AND column_name='tong_no') THEN
        ALTER TABLE tm_cong_no_noi_bo ADD COLUMN tong_no DECIMAL(15,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_noi_bo' AND column_name='tong_da_tra') THEN
        ALTER TABLE tm_cong_no_noi_bo ADD COLUMN tong_da_tra DECIMAL(15,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_noi_bo' AND column_name='con_lai') THEN
        ALTER TABLE tm_cong_no_noi_bo ADD COLUMN con_lai DECIMAL(15,2) GENERATED ALWAYS AS (tong_no - tong_da_tra) STORED;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_noi_bo' AND column_name='ngay_cap_nhat') THEN
        ALTER TABLE tm_cong_no_noi_bo ADD COLUMN ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

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
    ngay_phat_sinh DATE NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_noi_bo_ct' AND column_name='so_phieu_chuyen_kho') THEN
        ALTER TABLE tm_cong_no_noi_bo_ct ADD COLUMN so_phieu_chuyen_kho VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_noi_bo_ct' AND column_name='so_tien') THEN
        ALTER TABLE tm_cong_no_noi_bo_ct ADD COLUMN so_tien DECIMAL(15,2) NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_noi_bo_ct' AND column_name='da_thanh_toan') THEN
        ALTER TABLE tm_cong_no_noi_bo_ct ADD COLUMN da_thanh_toan DECIMAL(15,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_noi_bo_ct' AND column_name='con_lai') THEN
        ALTER TABLE tm_cong_no_noi_bo_ct ADD COLUMN con_lai DECIMAL(15,2) GENERATED ALWAYS AS (so_tien - da_thanh_toan) STORED;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_noi_bo_ct' AND column_name='han_thanh_toan') THEN
        ALTER TABLE tm_cong_no_noi_bo_ct ADD COLUMN han_thanh_toan DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_noi_bo_ct' AND column_name='trang_thai') THEN
        ALTER TABLE tm_cong_no_noi_bo_ct ADD COLUMN trang_thai enum_trang_thai_cong_no DEFAULT 'CHUA_TT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_noi_bo_ct' AND column_name='ghi_chu') THEN
        ALTER TABLE tm_cong_no_noi_bo_ct ADD COLUMN ghi_chu TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_cong_no_noi_bo_ct' AND column_name='ngay_tao') THEN
        ALTER TABLE tm_cong_no_noi_bo_ct ADD COLUMN ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

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
    so_tien DECIMAL(15,2) NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_phieu_thu_chi' AND column_name='loai_phieu') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN loai_phieu enum_loai_phieu_thu_chi NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_phieu_thu_chi' AND column_name='hinh_thuc') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN hinh_thuc enum_hinh_thuc_thanh_toan NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_phieu_thu_chi' AND column_name='ma_hoa_don') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN ma_hoa_don VARCHAR(50) REFERENCES tm_hoa_don(so_hoa_don);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_phieu_thu_chi' AND column_name='ma_doi_tac') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN ma_doi_tac VARCHAR(50) REFERENCES dm_doi_tac(ma_doi_tac);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_phieu_thu_chi' AND column_name='ma_kho') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN ma_kho VARCHAR(50) REFERENCES sys_kho(ma_kho);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_phieu_thu_chi' AND column_name='ngay_giao_dich') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN ngay_giao_dich TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_phieu_thu_chi' AND column_name='noi_dung') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN noi_dung TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_phieu_thu_chi' AND column_name='nguoi_lap') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN nguoi_lap VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_phieu_thu_chi' AND column_name='nguoi_nhan') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN nguoi_nhan VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_phieu_thu_chi' AND column_name='nguoi_nop') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN nguoi_nop VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_phieu_thu_chi' AND column_name='ghi_chu') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN ghi_chu TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tm_phieu_thu_chi' AND column_name='ngay_tao') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

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
