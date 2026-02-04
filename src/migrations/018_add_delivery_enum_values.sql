-- Step 1: Add new states to enum_trang_thai_hoa_don
-- This must be in a separate file/transaction from where it's used in an index or default value
ALTER TYPE enum_trang_thai_hoa_don ADD VALUE IF NOT EXISTS 'CHO_DUYET_GIAO';
ALTER TYPE enum_trang_thai_hoa_don ADD VALUE IF NOT EXISTS 'DA_DUYET_GIAO';
