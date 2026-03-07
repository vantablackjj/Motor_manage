-- Migration to add missing enum values to enum_trang_thai_don_hang
-- This is needed because some services use GUI_DUYET, CHO_DUYET, TU_CHOI, and DA_HUY
-- which were missing from the original enum definition.

-- ALTER TYPE ADD VALUE cannot run inside a transaction block in PostgreSQL.
-- The MigrationRunner should handle this correctly if it splits statements.

ALTER TYPE enum_trang_thai_don_hang ADD VALUE IF NOT EXISTS 'GUI_DUYET';
ALTER TYPE enum_trang_thai_don_hang ADD VALUE IF NOT EXISTS 'CHO_DUYET';
ALTER TYPE enum_trang_thai_don_hang ADD VALUE IF NOT EXISTS 'TU_CHOI';
ALTER TYPE enum_trang_thai_don_hang ADD VALUE IF NOT EXISTS 'DA_HUY';
