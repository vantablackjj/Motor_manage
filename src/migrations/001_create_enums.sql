-- =====================================================
-- MIGRATION 001: CREATE ENUM TYPES (Idempotent)
-- Description: Create all ENUM types without dropping existing ones
-- =====================================================

DO $$
BEGIN
    -- 1. enum_loai_doi_tac
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_loai_doi_tac') THEN
        CREATE TYPE enum_loai_doi_tac AS ENUM ('KHACH_HANG', 'NHA_CUNG_CAP', 'CA_HAI');
    ELSE
        ALTER TYPE enum_loai_doi_tac ADD VALUE IF NOT EXISTS 'KHACH_HANG';
        ALTER TYPE enum_loai_doi_tac ADD VALUE IF NOT EXISTS 'NHA_CUNG_CAP';
        ALTER TYPE enum_loai_doi_tac ADD VALUE IF NOT EXISTS 'CA_HAI';
    END IF;

    -- 2. enum_loai_quan_ly
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_loai_quan_ly') THEN
        CREATE TYPE enum_loai_quan_ly AS ENUM ('SERIAL', 'BATCH');
    ELSE
        ALTER TYPE enum_loai_quan_ly ADD VALUE IF NOT EXISTS 'SERIAL';
        ALTER TYPE enum_loai_quan_ly ADD VALUE IF NOT EXISTS 'BATCH';
    END IF;

    -- 3. enum_loai_don_hang
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_loai_don_hang') THEN
        CREATE TYPE enum_loai_don_hang AS ENUM ('MUA_HANG', 'BAN_HANG', 'CHUYEN_KHO', 'MUA_XE');
    ELSE
        ALTER TYPE enum_loai_don_hang ADD VALUE IF NOT EXISTS 'MUA_HANG';
        ALTER TYPE enum_loai_don_hang ADD VALUE IF NOT EXISTS 'BAN_HANG';
        ALTER TYPE enum_loai_don_hang ADD VALUE IF NOT EXISTS 'CHUYEN_KHO';
        ALTER TYPE enum_loai_don_hang ADD VALUE IF NOT EXISTS 'MUA_XE';
    END IF;

    -- 4. enum_trang_thai_don_hang
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_trang_thai_don_hang') THEN
        CREATE TYPE enum_trang_thai_don_hang AS ENUM ('NHAP', 'DA_DUYET', 'DANG_GIAO', 'HOAN_THANH', 'HUY', 'GUI_DUYET', 'DA_HUY', 'TU_CHOI', 'DANG_NHAP_KHO', 'DA_NHAP_KHO');
    ELSE
        ALTER TYPE enum_trang_thai_don_hang ADD VALUE IF NOT EXISTS 'NHAP';
        ALTER TYPE enum_trang_thai_don_hang ADD VALUE IF NOT EXISTS 'DA_DUYET';
        ALTER TYPE enum_trang_thai_don_hang ADD VALUE IF NOT EXISTS 'DANG_GIAO';
        ALTER TYPE enum_trang_thai_don_hang ADD VALUE IF NOT EXISTS 'HOAN_THANH';
        ALTER TYPE enum_trang_thai_don_hang ADD VALUE IF NOT EXISTS 'HUY';
        ALTER TYPE enum_trang_thai_don_hang ADD VALUE IF NOT EXISTS 'GUI_DUYET';
        ALTER TYPE enum_trang_thai_don_hang ADD VALUE IF NOT EXISTS 'DA_HUY';
        ALTER TYPE enum_trang_thai_don_hang ADD VALUE IF NOT EXISTS 'TU_CHOI';
        ALTER TYPE enum_trang_thai_don_hang ADD VALUE IF NOT EXISTS 'DANG_NHAP_KHO';
        ALTER TYPE enum_trang_thai_don_hang ADD VALUE IF NOT EXISTS 'DA_NHAP_KHO';
    END IF;

    -- 5. enum_loai_hoa_don
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_loai_hoa_don') THEN
        CREATE TYPE enum_loai_hoa_don AS ENUM ('MUA_HANG', 'BAN_HANG', 'CHUYEN_KHO');
    ELSE
        ALTER TYPE enum_loai_hoa_don ADD VALUE IF NOT EXISTS 'MUA_HANG';
        ALTER TYPE enum_loai_hoa_don ADD VALUE IF NOT EXISTS 'BAN_HANG';
        ALTER TYPE enum_loai_hoa_don ADD VALUE IF NOT EXISTS 'CHUYEN_KHO';
    END IF;

    -- 6. enum_trang_thai_hoa_don
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_trang_thai_hoa_don') THEN
        CREATE TYPE enum_trang_thai_hoa_don AS ENUM ('NHAP', 'DA_XUAT', 'DA_GIAO', 'DA_THANH_TOAN', 'HUY');
    ELSE
        ALTER TYPE enum_trang_thai_hoa_don ADD VALUE IF NOT EXISTS 'NHAP';
        ALTER TYPE enum_trang_thai_hoa_don ADD VALUE IF NOT EXISTS 'DA_XUAT';
        ALTER TYPE enum_trang_thai_hoa_don ADD VALUE IF NOT EXISTS 'DA_GIAO';
        ALTER TYPE enum_trang_thai_hoa_don ADD VALUE IF NOT EXISTS 'DA_THANH_TOAN';
        ALTER TYPE enum_trang_thai_hoa_don ADD VALUE IF NOT EXISTS 'HUY';
    END IF;

    -- 7. enum_loai_phieu_kho
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_loai_phieu_kho') THEN
        CREATE TYPE enum_loai_phieu_kho AS ENUM ('NHAP_MUA', 'NHAP_CHUYEN', 'XUAT_BAN', 'XUAT_CHUYEN', 'XUAT_HUY', 'KIEM_KE');
    ELSE
        ALTER TYPE enum_loai_phieu_kho ADD VALUE IF NOT EXISTS 'NHAP_MUA';
        ALTER TYPE enum_loai_phieu_kho ADD VALUE IF NOT EXISTS 'NHAP_CHUYEN';
        ALTER TYPE enum_loai_phieu_kho ADD VALUE IF NOT EXISTS 'XUAT_BAN';
        ALTER TYPE enum_loai_phieu_kho ADD VALUE IF NOT EXISTS 'XUAT_CHUYEN';
        ALTER TYPE enum_loai_phieu_kho ADD VALUE IF NOT EXISTS 'XUAT_HUY';
        ALTER TYPE enum_loai_phieu_kho ADD VALUE IF NOT EXISTS 'KIEM_KE';
    END IF;

    -- 8. enum_trang_thai_phieu_kho
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_trang_thai_phieu_kho') THEN
        CREATE TYPE enum_trang_thai_phieu_kho AS ENUM ('NHAP', 'DA_DUYET', 'HUY');
    ELSE
        ALTER TYPE enum_trang_thai_phieu_kho ADD VALUE IF NOT EXISTS 'NHAP';
        ALTER TYPE enum_trang_thai_phieu_kho ADD VALUE IF NOT EXISTS 'DA_DUYET';
        ALTER TYPE enum_trang_thai_phieu_kho ADD VALUE IF NOT EXISTS 'HUY';
    END IF;

    -- 9. enum_trang_thai_serial
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_trang_thai_serial') THEN
        CREATE TYPE enum_trang_thai_serial AS ENUM ('TON_KHO', 'DANG_GIAO', 'DA_BAN', 'BAO_HANH', 'HU_HONG', 'DANG_CHUYEN');
    ELSE
        ALTER TYPE enum_trang_thai_serial ADD VALUE IF NOT EXISTS 'TON_KHO';
        ALTER TYPE enum_trang_thai_serial ADD VALUE IF NOT EXISTS 'DANG_GIAO';
        ALTER TYPE enum_trang_thai_serial ADD VALUE IF NOT EXISTS 'DA_BAN';
        ALTER TYPE enum_trang_thai_serial ADD VALUE IF NOT EXISTS 'BAO_HANH';
        ALTER TYPE enum_trang_thai_serial ADD VALUE IF NOT EXISTS 'HU_HONG';
        ALTER TYPE enum_trang_thai_serial ADD VALUE IF NOT EXISTS 'DANG_CHUYEN';
    END IF;

    -- 10. enum_loai_cong_no
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_loai_cong_no') THEN
        CREATE TYPE enum_loai_cong_no AS ENUM ('PHAI_THU', 'PHAI_TRA');
    ELSE
        ALTER TYPE enum_loai_cong_no ADD VALUE IF NOT EXISTS 'PHAI_THU';
        ALTER TYPE enum_loai_cong_no ADD VALUE IF NOT EXISTS 'PHAI_TRA';
    END IF;

    -- 11. enum_trang_thai_cong_no
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_trang_thai_cong_no') THEN
        CREATE TYPE enum_trang_thai_cong_no AS ENUM ('CHUA_TT', 'TT_MOT_PHAN', 'DA_TT', 'QUA_HAN');
    ELSE
        ALTER TYPE enum_trang_thai_cong_no ADD VALUE IF NOT EXISTS 'CHUA_TT';
        ALTER TYPE enum_trang_thai_cong_no ADD VALUE IF NOT EXISTS 'TT_MOT_PHAN';
        ALTER TYPE enum_trang_thai_cong_no ADD VALUE IF NOT EXISTS 'DA_TT';
        ALTER TYPE enum_trang_thai_cong_no ADD VALUE IF NOT EXISTS 'QUA_HAN';
    END IF;

    -- 12. enum_loai_phieu_thu_chi
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_loai_phieu_thu_chi') THEN
        CREATE TYPE enum_loai_phieu_thu_chi AS ENUM ('THU', 'CHI');
    ELSE
        ALTER TYPE enum_loai_phieu_thu_chi ADD VALUE IF NOT EXISTS 'THU';
        ALTER TYPE enum_loai_phieu_thu_chi ADD VALUE IF NOT EXISTS 'CHI';
    END IF;

    -- 13. enum_hinh_thuc_thanh_toan
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_hinh_thuc_thanh_toan') THEN
        CREATE TYPE enum_hinh_thuc_thanh_toan AS ENUM ('TIEN_MAT', 'CHUYEN_KHOAN', 'THE');
    ELSE
        ALTER TYPE enum_hinh_thuc_thanh_toan ADD VALUE IF NOT EXISTS 'TIEN_MAT';
        ALTER TYPE enum_hinh_thuc_thanh_toan ADD VALUE IF NOT EXISTS 'CHUYEN_KHOAN';
        ALTER TYPE enum_hinh_thuc_thanh_toan ADD VALUE IF NOT EXISTS 'THE';
    END IF;

    -- 14. enum_loai_ben
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_loai_ben') THEN
        CREATE TYPE enum_loai_ben AS ENUM ('KHO', 'DOI_TAC');
    ELSE
        ALTER TYPE enum_loai_ben ADD VALUE IF NOT EXISTS 'KHO';
        ALTER TYPE enum_loai_ben ADD VALUE IF NOT EXISTS 'DOI_TAC';
    END IF;

END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 001: ENUM types checked/created successfully';
END $$;
