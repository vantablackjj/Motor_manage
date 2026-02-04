-- =====================================================
-- MIGRATION 021: CREATE CASH FUND MANAGEMENT
-- Description: Quản lý quỹ tiền mặt và ngân hàng cho từng kho
-- Author: System Enhancement
-- Date: 2026-02-04
-- =====================================================

-- =====================================================
-- QUỸ TIỀN MẶT (Cash Fund per Warehouse)
-- =====================================================
CREATE TABLE IF NOT EXISTS tm_quy_tien_mat (
    id SERIAL PRIMARY KEY,
    ma_kho VARCHAR(50) REFERENCES sys_kho(ma_kho) NOT NULL,
    loai_quy enum_loai_quy NOT NULL, -- TIEN_MAT, NGAN_HANG, VI_DIEN_TU
    ten_quy VARCHAR(255) NOT NULL, -- Tên quỹ (VD: "Quỹ tiền mặt", "VCB - 123456789")
    so_du_hien_tai DECIMAL(15,2) DEFAULT 0,
    so_du_khoi_tao DECIMAL(15,2) DEFAULT 0, -- Số dư ban đầu
    ngay_khoi_tao DATE DEFAULT CURRENT_DATE,
    trang_thai BOOLEAN DEFAULT TRUE, -- Active/Inactive
    thong_tin_them JSONB DEFAULT '{}', -- {bank_name, account_number, branch, etc.}
    ghi_chu TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(ma_kho, loai_quy, ten_quy)
);

CREATE INDEX idx_tm_quy_tien_mat_kho ON tm_quy_tien_mat(ma_kho);
CREATE INDEX idx_tm_quy_tien_mat_loai ON tm_quy_tien_mat(loai_quy);
CREATE INDEX idx_tm_quy_tien_mat_status ON tm_quy_tien_mat(trang_thai);

COMMENT ON TABLE tm_quy_tien_mat IS 'Quỹ tiền mặt/ngân hàng của từng kho';
COMMENT ON COLUMN tm_quy_tien_mat.loai_quy IS 'TIEN_MAT, NGAN_HANG, VI_DIEN_TU';
COMMENT ON COLUMN tm_quy_tien_mat.thong_tin_them IS 'JSONB: {bank_name, account_number, branch, card_number}';

-- =====================================================
-- LỊCH SỬ BIẾN ĐỘNG QUỸ (Fund Transaction History)
-- =====================================================
CREATE TABLE IF NOT EXISTS tm_lich_su_quy (
    id SERIAL PRIMARY KEY,
    ma_quy INTEGER REFERENCES tm_quy_tien_mat(id) NOT NULL,
    so_phieu_tc VARCHAR(50) REFERENCES tm_phieu_thu_chi(so_phieu_tc), -- Link to receipt/payment
    loai_bien_dong enum_loai_bien_dong_quy NOT NULL, -- TANG, GIAM
    so_tien DECIMAL(15,2) NOT NULL,
    so_du_truoc DECIMAL(15,2) NOT NULL,
    so_du_sau DECIMAL(15,2) NOT NULL,
    noi_dung TEXT,
    ngay_giao_dich TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tm_lich_su_quy_ma_quy ON tm_lich_su_quy(ma_quy);
CREATE INDEX idx_tm_lich_su_quy_phieu ON tm_lich_su_quy(so_phieu_tc);
CREATE INDEX idx_tm_lich_su_quy_ngay ON tm_lich_su_quy(ngay_giao_dich DESC);

COMMENT ON TABLE tm_lich_su_quy IS 'Lịch sử biến động quỹ tiền mặt';

-- =====================================================
-- ADD ENUM TYPES
-- =====================================================
DO $$ 
BEGIN
    -- Loại quỹ
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_loai_quy') THEN
        CREATE TYPE enum_loai_quy AS ENUM ('TIEN_MAT', 'NGAN_HANG', 'VI_DIEN_TU');
    END IF;
    
    -- Loại biến động quỹ
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_loai_bien_dong_quy') THEN
        CREATE TYPE enum_loai_bien_dong_quy AS ENUM ('TANG', 'GIAM');
    END IF;
END $$;

-- =====================================================
-- ADD COLUMNS TO tm_phieu_thu_chi
-- =====================================================
DO $$
BEGIN
    -- Add ma_quy to link receipt/payment to specific fund
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'ma_quy') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN ma_quy INTEGER REFERENCES tm_quy_tien_mat(id);
    END IF;
    
    -- Add trang_thai if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'trang_thai') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN trang_thai enum_trang_thai DEFAULT 'NHAP';
    END IF;
    
    -- Add nguoi_duyet if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'nguoi_duyet') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN nguoi_duyet INTEGER REFERENCES sys_user(id);
    END IF;
    
    -- Add ngay_duyet if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'ngay_duyet') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN ngay_duyet TIMESTAMP;
    END IF;
    
    -- Add metadata if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'metadata') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- =====================================================
-- FUNCTION: Cập nhật quỹ khi phê duyệt phiếu thu/chi
-- =====================================================
CREATE OR REPLACE FUNCTION fn_update_fund_on_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_quy_id INTEGER;
    v_so_du_truoc DECIMAL(15,2);
    v_so_du_sau DECIMAL(15,2);
    v_loai_bien_dong enum_loai_bien_dong_quy;
BEGIN
    -- Chỉ xử lý khi chuyển sang trạng thái DA_DUYET
    IF NEW.trang_thai = 'DA_DUYET' AND OLD.trang_thai != 'DA_DUYET' THEN
        
        -- Lấy thông tin quỹ
        v_quy_id := NEW.ma_quy;
        
        -- Nếu không có ma_quy, tìm quỹ tiền mặt mặc định của kho
        IF v_quy_id IS NULL AND NEW.ma_kho IS NOT NULL THEN
            SELECT id INTO v_quy_id
            FROM tm_quy_tien_mat
            WHERE ma_kho = NEW.ma_kho 
              AND loai_quy = NEW.hinh_thuc::text::enum_loai_quy
              AND trang_thai = TRUE
            LIMIT 1;
            
            -- Cập nhật ma_quy vào phiếu
            UPDATE tm_phieu_thu_chi SET ma_quy = v_quy_id WHERE id = NEW.id;
        END IF;
        
        -- Nếu vẫn không tìm thấy quỹ, bỏ qua (có thể là phiếu không liên quan đến quỹ)
        IF v_quy_id IS NULL THEN
            RETURN NEW;
        END IF;
        
        -- Lấy số dư hiện tại
        SELECT so_du_hien_tai INTO v_so_du_truoc
        FROM tm_quy_tien_mat
        WHERE id = v_quy_id
        FOR UPDATE;
        
        -- Xác định loại biến động và tính số dư mới
        IF NEW.loai_phieu = 'THU' THEN
            v_loai_bien_dong := 'TANG';
            v_so_du_sau := v_so_du_truoc + NEW.so_tien;
        ELSE -- CHI
            v_loai_bien_dong := 'GIAM';
            v_so_du_sau := v_so_du_truoc - NEW.so_tien;
        END IF;
        
        -- Kiểm tra số dư âm (chỉ cảnh báo, không chặn)
        IF v_so_du_sau < 0 THEN
            RAISE WARNING 'Số dư quỹ % âm: %', v_quy_id, v_so_du_sau;
        END IF;
        
        -- Cập nhật số dư quỹ
        UPDATE tm_quy_tien_mat
        SET so_du_hien_tai = v_so_du_sau,
            updated_at = NOW()
        WHERE id = v_quy_id;
        
        -- Ghi lịch sử biến động
        INSERT INTO tm_lich_su_quy (
            ma_quy, so_phieu_tc, loai_bien_dong, so_tien,
            so_du_truoc, so_du_sau, noi_dung, ngay_giao_dich
        ) VALUES (
            v_quy_id, NEW.so_phieu_tc, v_loai_bien_dong, NEW.so_tien,
            v_so_du_truoc, v_so_du_sau, NEW.noi_dung, NEW.ngay_giao_dich
        );
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Tự động cập nhật quỹ khi phê duyệt
-- =====================================================
DROP TRIGGER IF EXISTS trg_update_fund_on_approval ON tm_phieu_thu_chi;
CREATE TRIGGER trg_update_fund_on_approval
    AFTER UPDATE ON tm_phieu_thu_chi
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_fund_on_approval();

-- =====================================================
-- FUNCTION: Hoàn trả quỹ khi hủy phiếu
-- =====================================================
CREATE OR REPLACE FUNCTION fn_revert_fund_on_cancel()
RETURNS TRIGGER AS $$
DECLARE
    v_quy_id INTEGER;
    v_so_du_truoc DECIMAL(15,2);
    v_so_du_sau DECIMAL(15,2);
    v_loai_bien_dong enum_loai_bien_dong_quy;
BEGIN
    -- Chỉ xử lý khi chuyển từ DA_DUYET sang HUY
    IF NEW.trang_thai = 'HUY' AND OLD.trang_thai = 'DA_DUYET' THEN
        
        v_quy_id := OLD.ma_quy;
        
        IF v_quy_id IS NULL THEN
            RETURN NEW;
        END IF;
        
        -- Lấy số dư hiện tại
        SELECT so_du_hien_tai INTO v_so_du_truoc
        FROM tm_quy_tien_mat
        WHERE id = v_quy_id
        FOR UPDATE;
        
        -- Hoàn trả ngược lại
        IF OLD.loai_phieu = 'THU' THEN
            v_loai_bien_dong := 'GIAM';
            v_so_du_sau := v_so_du_truoc - OLD.so_tien;
        ELSE -- CHI
            v_loai_bien_dong := 'TANG';
            v_so_du_sau := v_so_du_truoc + OLD.so_tien;
        END IF;
        
        -- Cập nhật số dư quỹ
        UPDATE tm_quy_tien_mat
        SET so_du_hien_tai = v_so_du_sau,
            updated_at = NOW()
        WHERE id = v_quy_id;
        
        -- Ghi lịch sử hoàn trả
        INSERT INTO tm_lich_su_quy (
            ma_quy, so_phieu_tc, loai_bien_dong, so_tien,
            so_du_truoc, so_du_sau, noi_dung, ngay_giao_dich
        ) VALUES (
            v_quy_id, OLD.so_phieu_tc, v_loai_bien_dong, OLD.so_tien,
            v_so_du_truoc, v_so_du_sau, 
            'Hoàn trả do hủy phiếu: ' || COALESCE(OLD.noi_dung, ''), 
            NOW()
        );
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Hoàn trả quỹ khi hủy phiếu
-- =====================================================
DROP TRIGGER IF EXISTS trg_revert_fund_on_cancel ON tm_phieu_thu_chi;
CREATE TRIGGER trg_revert_fund_on_cancel
    AFTER UPDATE ON tm_phieu_thu_chi
    FOR EACH ROW
    EXECUTE FUNCTION fn_revert_fund_on_cancel();

-- =====================================================
-- CREATE DEFAULT FUNDS FOR EXISTING WAREHOUSES
-- =====================================================
DO $$
DECLARE
    v_kho RECORD;
BEGIN
    FOR v_kho IN (SELECT ma_kho, ten_kho FROM sys_kho WHERE status = TRUE)
    LOOP
        -- Tạo quỹ tiền mặt mặc định
        INSERT INTO tm_quy_tien_mat (ma_kho, loai_quy, ten_quy, so_du_khoi_tao, so_du_hien_tai)
        VALUES (v_kho.ma_kho, 'TIEN_MAT', 'Quỹ tiền mặt ' || v_kho.ten_kho, 0, 0)
        ON CONFLICT (ma_kho, loai_quy, ten_quy) DO NOTHING;
        
        -- Tạo quỹ ngân hàng mặc định (nếu cần)
        INSERT INTO tm_quy_tien_mat (ma_kho, loai_quy, ten_quy, so_du_khoi_tao, so_du_hien_tai)
        VALUES (v_kho.ma_kho, 'NGAN_HANG', 'Tài khoản ngân hàng ' || v_kho.ten_kho, 0, 0)
        ON CONFLICT (ma_kho, loai_quy, ten_quy) DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Created default funds for all active warehouses';
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 021: Cash Fund Management created successfully';
END $$;
