-- Migration to fix missing enum values across various types
-- This addresses inconsistencies between code constants/services and database schema

-- 1. enum_loai_don_hang
ALTER TYPE enum_loai_don_hang ADD VALUE IF NOT EXISTS 'MUA_XE';
ALTER TYPE enum_loai_don_hang ADD VALUE IF NOT EXISTS 'BAN_XE';

-- 2. enum_trang_thai_don_hang
ALTER TYPE enum_trang_thai_don_hang ADD VALUE IF NOT EXISTS 'DANG_NHAP_KHO';
ALTER TYPE enum_trang_thai_don_hang ADD VALUE IF NOT EXISTS 'DANG_GIAO_KHO'; -- Possible future use

-- 3. enum_loai_hoa_don
ALTER TYPE enum_loai_hoa_don ADD VALUE IF NOT EXISTS 'TRA_HANG_MUA';
ALTER TYPE enum_loai_hoa_don ADD VALUE IF NOT EXISTS 'TRA_HANG_BAN';

-- 4. enum_loai_phieu_kho
ALTER TYPE enum_loai_phieu_kho ADD VALUE IF NOT EXISTS 'NHAP_KHO';
ALTER TYPE enum_loai_phieu_kho ADD VALUE IF NOT EXISTS 'XUAT_KHO';
ALTER TYPE enum_loai_phieu_kho ADD VALUE IF NOT EXISTS 'BAN_HANG';
ALTER TYPE enum_loai_phieu_kho ADD VALUE IF NOT EXISTS 'TRA_HANG';
ALTER TYPE enum_loai_phieu_kho ADD VALUE IF NOT EXISTS 'CAP_NHAT';

-- 5. enum_trang_thai_serial
ALTER TYPE enum_trang_thai_serial ADD VALUE IF NOT EXISTS 'CHO_NHAP_KHO';
ALTER TYPE enum_trang_thai_serial ADD VALUE IF NOT EXISTS 'CHO_XUAT_KHO';
