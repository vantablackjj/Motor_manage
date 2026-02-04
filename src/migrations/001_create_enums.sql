-- =====================================================
-- MIGRATION 001: CREATE ENUM TYPES
-- Description: Create all ENUM types for the enhanced schema
-- Author: Backend Upgrade
-- Date: 2026-01-20
-- =====================================================

-- Drop existing enums if they exist (for idempotency)
DROP TYPE IF EXISTS enum_loai_doi_tac CASCADE;
DROP TYPE IF EXISTS enum_loai_quan_ly CASCADE;
DROP TYPE IF EXISTS enum_loai_don_hang CASCADE;
DROP TYPE IF EXISTS enum_trang_thai_don_hang CASCADE;
DROP TYPE IF EXISTS enum_loai_hoa_don CASCADE;
DROP TYPE IF EXISTS enum_trang_thai_hoa_don CASCADE;
DROP TYPE IF EXISTS enum_loai_phieu_kho CASCADE;
DROP TYPE IF EXISTS enum_trang_thai_phieu_kho CASCADE;
DROP TYPE IF EXISTS enum_trang_thai_serial CASCADE;
DROP TYPE IF EXISTS enum_loai_cong_no CASCADE;
DROP TYPE IF EXISTS enum_trang_thai_cong_no CASCADE;
DROP TYPE IF EXISTS enum_loai_phieu_thu_chi CASCADE;
DROP TYPE IF EXISTS enum_hinh_thuc_thanh_toan CASCADE;
DROP TYPE IF EXISTS enum_loai_ben CASCADE;

-- Đối tác
CREATE TYPE enum_loai_doi_tac AS ENUM (
    'KHACH_HANG',
    'NHA_CUNG_CAP',
    'CA_HAI'
);

-- Quản lý hàng hóa
CREATE TYPE enum_loai_quan_ly AS ENUM (
    'SERIAL',  -- Tracking từng unit (xe, laptop, điện thoại)
    'BATCH'    -- Tracking theo lô (phụ tùng, vật tư)
);

-- Đơn hàng
CREATE TYPE enum_loai_don_hang AS ENUM (
    'MUA_HANG',
    'BAN_HANG',
    'CHUYEN_KHO'
);

CREATE TYPE enum_trang_thai_don_hang AS ENUM (
    'NHAP',
    'DA_DUYET',
    'DANG_GIAO',
    'HOAN_THANH',
    'HUY'
);

-- Hóa đơn
CREATE TYPE enum_loai_hoa_don AS ENUM (
    'MUA_HANG',
    'BAN_HANG',
    'CHUYEN_KHO'
);

CREATE TYPE enum_trang_thai_hoa_don AS ENUM (
    'NHAP',
    'DA_XUAT',
    'DA_GIAO',
    'DA_THANH_TOAN',
    'HUY'
);

-- Phiếu kho
CREATE TYPE enum_loai_phieu_kho AS ENUM (
    'NHAP_MUA',
    'NHAP_CHUYEN',
    'XUAT_BAN',
    'XUAT_CHUYEN',
    'XUAT_HUY',
    'KIEM_KE'
);

CREATE TYPE enum_trang_thai_phieu_kho AS ENUM (
    'NHAP',
    'DA_DUYET',
    'HUY'
);

-- Serial tracking
CREATE TYPE enum_trang_thai_serial AS ENUM (
    'TON_KHO',
    'DANG_GIAO',
    'DA_BAN',
    'BAO_HANH',
    'HU_HONG',
    'DANG_CHUYEN'
);

-- Công nợ
CREATE TYPE enum_loai_cong_no AS ENUM (
    'PHAI_THU',
    'PHAI_TRA'
);

CREATE TYPE enum_trang_thai_cong_no AS ENUM (
    'CHUA_TT',
    'TT_MOT_PHAN',
    'DA_TT',
    'QUA_HAN'
);

-- Thu chi
CREATE TYPE enum_loai_phieu_thu_chi AS ENUM (
    'THU',
    'CHI'
);

CREATE TYPE enum_hinh_thuc_thanh_toan AS ENUM (
    'TIEN_MAT',
    'CHUYEN_KHOAN',
    'THE'
);

-- Bên giao dịch (polymorphic)
CREATE TYPE enum_loai_ben AS ENUM (
    'KHO',
    'DOI_TAC'
);

-- Create indexes for enum usage
COMMENT ON TYPE enum_loai_doi_tac IS 'Loại đối tác: Khách hàng, Nhà cung cấp, hoặc cả hai';
COMMENT ON TYPE enum_loai_quan_ly IS 'Cách quản lý hàng hóa: SERIAL (từng unit) hoặc BATCH (theo lô)';
COMMENT ON TYPE enum_loai_don_hang IS 'Loại đơn hàng: Mua, Bán, hoặc Chuyển kho';
COMMENT ON TYPE enum_trang_thai_serial IS 'Trạng thái của serial: Tồn kho, Đang giao, Đã bán, Bảo hành, Hư hỏng';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 001: ENUM types created successfully';
END $$;
