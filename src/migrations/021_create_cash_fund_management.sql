-- =====================================================
-- MIGRATION 021: CREATE CASH FUND MANAGEMENT (Robust Version)
-- Description: Quản lý quỹ tiền mặt và ngân hàng cho từng kho
-- =====================================================

-- 1. Create Enums if not exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_loai_quy') THEN
        CREATE TYPE enum_loai_quy AS ENUM ('TIEN_MAT', 'NGAN_HANG', 'VI_DIEN_TU');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_loai_bien_dong_quy') THEN
        CREATE TYPE enum_loai_bien_dong_quy AS ENUM ('TANG', 'GIAM');
    END IF;
END $$;

-- 2. Create Fund table
CREATE TABLE IF NOT EXISTS tm_quy_tien_mat (
    id SERIAL PRIMARY KEY,
    ma_kho VARCHAR(50) REFERENCES sys_kho(ma_kho) NOT NULL,
    loai_quy enum_loai_quy NOT NULL,
    ten_quy VARCHAR(255) NOT NULL,
    so_du_hien_tai DECIMAL(15,2) DEFAULT 0,
    so_du_khoi_tao DECIMAL(15,2) DEFAULT 0,
    ngay_khoi_tao DATE DEFAULT CURRENT_DATE,
    trang_thai BOOLEAN DEFAULT TRUE,
    thong_tin_them JSONB DEFAULT '{}',
    ghi_chu TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ma_kho, loai_quy, ten_quy)
);

-- 3. Fund History Table
CREATE TABLE IF NOT EXISTS tm_lich_su_quy (
    id SERIAL PRIMARY KEY,
    ma_quy INTEGER REFERENCES tm_quy_tien_mat(id) NOT NULL,
    so_phieu_tc VARCHAR(50) REFERENCES tm_phieu_thu_chi(so_phieu_tc),
    loai_bien_dong enum_loai_bien_dong_quy NOT NULL,
    so_tien DECIMAL(15,2) NOT NULL,
    so_du_truoc DECIMAL(15,2) NOT NULL,
    so_du_sau DECIMAL(15,2) NOT NULL,
    noi_dung TEXT,
    ngay_giao_dich TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Update tm_phieu_thu_chi
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'ma_quy') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN ma_quy INTEGER REFERENCES tm_quy_tien_mat(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'trang_thai') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN trang_thai VARCHAR(50) DEFAULT 'NHAP';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'nguoi_duyet') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN nguoi_duyet INTEGER REFERENCES sys_user(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'ngay_duyet') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN ngay_duyet TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_phieu_thu_chi' AND column_name = 'metadata') THEN
        ALTER TABLE tm_phieu_thu_chi ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- 5. Helper Function for mapping fund type
CREATE OR REPLACE FUNCTION fn_get_fund_type(p_hinh_thuc TEXT)
RETURNS enum_loai_quy AS $$
BEGIN
    RETURN CASE 
        WHEN p_hinh_thuc = 'TIEN_MAT' THEN 'TIEN_MAT'::enum_loai_quy
        WHEN p_hinh_thuc = 'CHUYEN_KHOAN' THEN 'NGAN_HANG'::enum_loai_quy
        ELSE 'TIEN_MAT'::enum_loai_quy
    END;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger Function: Approval
CREATE OR REPLACE FUNCTION fn_update_fund_on_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_quy_id INTEGER;
    v_so_du_truoc DECIMAL(15,2);
    v_so_du_sau DECIMAL(15,2);
    v_loai_bien_dong enum_loai_bien_dong_quy;
    v_mapped_loai_quy enum_loai_quy;
BEGIN
    IF NEW.trang_thai = 'DA_DUYET' AND (OLD.trang_thai != 'DA_DUYET' OR OLD.trang_thai IS NULL) THEN
        v_quy_id := NEW.ma_quy;
        
        IF v_quy_id IS NULL AND NEW.ma_kho IS NOT NULL THEN
            v_mapped_loai_quy := fn_get_fund_type(NEW.hinh_thuc::text);
            SELECT id INTO v_quy_id FROM tm_quy_tien_mat
            WHERE ma_kho = NEW.ma_kho AND loai_quy = v_mapped_loai_quy AND trang_thai = TRUE
            LIMIT 1;
            
            IF v_quy_id IS NOT NULL THEN
                UPDATE tm_phieu_thu_chi SET ma_quy = v_quy_id WHERE id = NEW.id;
            END IF;
        END IF;
        
        IF v_quy_id IS NULL THEN RETURN NEW; END IF;
        
        SELECT so_du_hien_tai INTO v_so_du_truoc FROM tm_quy_tien_mat WHERE id = v_quy_id FOR UPDATE;
        
        IF NEW.loai_phieu = 'THU' THEN
            v_loai_bien_dong := 'TANG'; v_so_du_sau := v_so_du_truoc + NEW.so_tien;
        ELSE
            v_loai_bien_dong := 'GIAM'; v_so_du_sau := v_so_du_truoc - NEW.so_tien;
        END IF;
        
        UPDATE tm_quy_tien_mat SET so_du_hien_tai = v_so_du_sau, updated_at = NOW() WHERE id = v_quy_id;
        
        INSERT INTO tm_lich_su_quy (ma_quy, so_phieu_tc, loai_bien_dong, so_tien, so_du_truoc, so_du_sau, noi_dung, ngay_giao_dich)
        VALUES (v_quy_id, NEW.so_phieu_tc, v_loai_bien_dong, NEW.so_tien, v_so_du_truoc, v_so_du_sau, NEW.noi_dung, NEW.ngay_giao_dich);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger Function: Cancel
CREATE OR REPLACE FUNCTION fn_revert_fund_on_cancel()
RETURNS TRIGGER AS $$
DECLARE
    v_quy_id INTEGER;
    v_so_du_truoc DECIMAL(15,2);
    v_so_du_sau DECIMAL(15,2);
    v_loai_bien_dong enum_loai_bien_dong_quy;
BEGIN
    IF NEW.trang_thai = 'HUY' AND OLD.trang_thai = 'DA_DUYET' THEN
        v_quy_id := OLD.ma_quy;
        IF v_quy_id IS NULL THEN RETURN NEW; END IF;
        
        SELECT so_du_hien_tai INTO v_so_du_truoc FROM tm_quy_tien_mat WHERE id = v_quy_id FOR UPDATE;
        
        IF OLD.loai_phieu = 'THU' THEN
            v_loai_bien_dong := 'GIAM'; v_so_du_sau := v_so_du_truoc - OLD.so_tien;
        ELSE
            v_loai_bien_dong := 'TANG'; v_so_du_sau := v_so_du_truoc + OLD.so_tien;
        END IF;
        
        UPDATE tm_quy_tien_mat SET so_du_hien_tai = v_so_du_sau, updated_at = NOW() WHERE id = v_quy_id;
        
        INSERT INTO tm_lich_su_quy (ma_quy, so_phieu_tc, loai_bien_dong, so_tien, so_du_truoc, so_du_sau, noi_dung, ngay_giao_dich)
        VALUES (v_quy_id, OLD.so_phieu_tc, v_loai_bien_dong, OLD.so_tien, v_so_du_truoc, v_so_du_sau, 'Refund on cancel: ' || COALESCE(OLD.noi_dung, ''), NOW());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Triggers
DROP TRIGGER IF EXISTS trg_update_fund_on_approval ON tm_phieu_thu_chi;
CREATE TRIGGER trg_update_fund_on_approval AFTER UPDATE ON tm_phieu_thu_chi FOR EACH ROW EXECUTE FUNCTION fn_update_fund_on_approval();

DROP TRIGGER IF EXISTS trg_revert_fund_on_cancel ON tm_phieu_thu_chi;
CREATE TRIGGER trg_revert_fund_on_cancel AFTER UPDATE ON tm_phieu_thu_chi FOR EACH ROW EXECUTE FUNCTION fn_revert_fund_on_cancel();

-- 9. Initialize Funds
DO $$
DECLARE
    v_kho RECORD;
BEGIN
    FOR v_kho IN (SELECT ma_kho, ten_kho FROM sys_kho WHERE status = TRUE) LOOP
        INSERT INTO tm_quy_tien_mat (ma_kho, loai_quy, ten_quy, so_du_khoi_tao, so_du_hien_tai)
        VALUES (v_kho.ma_kho, 'TIEN_MAT', 'Cash Fund - ' || v_kho.ten_kho, 0, 0)
        ON CONFLICT (ma_kho, loai_quy, ten_quy) DO NOTHING;
        
        INSERT INTO tm_quy_tien_mat (ma_kho, loai_quy, ten_quy, so_du_khoi_tao, so_du_hien_tai)
        VALUES (v_kho.ma_kho, 'NGAN_HANG', 'Bank Account - ' || v_kho.ten_kho, 0, 0)
        ON CONFLICT (ma_kho, loai_quy, ten_quy) DO NOTHING;
    END LOOP;
END $$;
