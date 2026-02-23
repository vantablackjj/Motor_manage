-- =====================================================
-- MIGRATION: UPDATE ROLES AND PERMISSIONS
-- Description: Cập nhật hệ thống role theo yêu cầu mentor
-- Roles: ADMIN, BAN_HANG, KHO, KE_TOAN, QUAN_LY
-- Author: Antigravity
-- Date: 2026-02-11
-- =====================================================

-- Thêm cột ma_quyen nếu chưa có
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sys_role' AND column_name = 'ma_quyen'
    ) THEN
        ALTER TABLE sys_role ADD COLUMN ma_quyen VARCHAR(50) UNIQUE;
    END IF;
END $$;

-- Xóa các role cũ và tạo lại với hệ thống mới
DELETE FROM sys_role;

-- Insert 5 roles theo yêu cầu mentor
INSERT INTO sys_role (ma_quyen, ten_quyen, mo_ta, permissions, status) VALUES
(
    'ADMIN',
    'Quản trị viên',
    'Toàn quyền quản trị hệ thống',
    '{
        "users": {"view": true, "create": true, "edit": true, "delete": true},
        "roles": {"view": true, "create": true, "edit": true, "delete": true},
        "warehouses": {"view": true, "create": true, "edit": true, "delete": true},
        "products": {"view": true, "create": true, "edit": true, "delete": true, "view_cost": true},
        "partners": {"view": true, "create": true, "edit": true, "delete": true},
        "purchase_orders": {"view": true, "create": true, "edit": true, "delete": true, "approve": true},
        "sales_orders": {"view": true, "create": true, "edit": true, "delete": true, "approve": true},
        "invoices": {"view": true, "create": true, "edit": true, "delete": true},
        "inventory": {"view": true, "import": true, "export": true, "transfer": true, "adjust": true},
        "debt": {"view": true, "create": true, "edit": true, "delete": true},
        "payments": {"view": true, "create": true, "edit": true, "delete": true, "approve": true},
        "reports": {"view": true, "export": true, "view_financial": true},
        "settings": {"view": true, "edit": true}
    }'::jsonb,
    true
),
(
    'BAN_HANG',
    'Nhân viên bán hàng',
    'Quản lý bán hàng và khách hàng',
    '{
        "users": {"view": false},
        "roles": {"view": false},
        "warehouses": {"view": true, "create": false, "edit": false, "delete": false},
        "products": {"view": true, "create": false, "edit": false, "delete": false, "view_cost": false},
        "partners": {"view": true, "create": true, "edit": true, "delete": false},
        "purchase_orders": {"view": false},
        "sales_orders": {"view": true, "create": true, "edit": true, "delete": false, "approve": false},
        "invoices": {"view": true, "create": true, "edit": false, "delete": false},
        "inventory": {"view": true, "import": false, "export": true, "transfer": false, "adjust": false},
        "debt": {"view": true, "create": true, "edit": false, "delete": false},
        "payments": {"view": true, "create": true, "edit": false, "delete": false, "approve": false},
        "reports": {"view": true, "export": true, "view_financial": false},
        "settings": {"view": false, "edit": false}
    }'::jsonb,
    true
),
(
    'KHO',
    'Nhân viên kho',
    'Quản lý nhập xuất kho và tồn kho',
    '{
        "users": {"view": false},
        "roles": {"view": false},
        "warehouses": {"view": true, "create": false, "edit": false, "delete": false},
        "products": {"view": true, "create": false, "edit": false, "delete": false, "view_cost": false},
        "partners": {"view": true, "create": false, "edit": false, "delete": false},
        "purchase_orders": {"view": true, "create": false, "edit": false, "delete": false, "approve": false},
        "sales_orders": {"view": true, "create": false, "edit": false, "delete": false, "approve": false},
        "invoices": {"view": true, "create": true, "edit": false, "delete": false},
        "inventory": {"view": true, "import": true, "export": true, "transfer": true, "adjust": false},
        "debt": {"view": false},
        "payments": {"view": false},
        "reports": {"view": true, "export": true, "view_financial": false},
        "settings": {"view": false, "edit": false}
    }'::jsonb,
    true
),
(
    'KE_TOAN',
    'Kế toán',
    'Quản lý tài chính, công nợ và báo cáo',
    '{
        "users": {"view": true, "create": false, "edit": false, "delete": false},
        "roles": {"view": false},
        "warehouses": {"view": true, "create": false, "edit": false, "delete": false},
        "products": {"view": true, "create": false, "edit": true, "delete": false, "view_cost": true},
        "partners": {"view": true, "create": true, "edit": true, "delete": false},
        "purchase_orders": {"view": true, "create": false, "edit": true, "delete": false, "approve": true},
        "sales_orders": {"view": true, "create": false, "edit": true, "delete": false, "approve": true},
        "invoices": {"view": true, "create": false, "edit": true, "delete": false},
        "inventory": {"view": true, "import": false, "export": false, "transfer": false, "adjust": true},
        "debt": {"view": true, "create": true, "edit": true, "delete": true},
        "payments": {"view": true, "create": true, "edit": true, "delete": true, "approve": true},
        "reports": {"view": true, "export": true, "view_financial": true},
        "settings": {"view": true, "edit": false}
    }'::jsonb,
    true
),
(
    'QUAN_LY',
    'Quản lý',
    'Giám sát và phê duyệt các nghiệp vụ',
    '{
        "users": {"view": true, "create": true, "edit": true, "delete": false},
        "roles": {"view": true, "create": false, "edit": false, "delete": false},
        "warehouses": {"view": true, "create": true, "edit": true, "delete": false},
        "products": {"view": true, "create": true, "edit": true, "delete": false, "view_cost": true},
        "partners": {"view": true, "create": true, "edit": true, "delete": true},
        "purchase_orders": {"view": true, "create": true, "edit": true, "delete": false, "approve": true},
        "sales_orders": {"view": true, "create": true, "edit": true, "delete": false, "approve": true},
        "invoices": {"view": true, "create": true, "edit": true, "delete": false},
        "inventory": {"view": true, "import": true, "export": true, "transfer": true, "adjust": true},
        "debt": {"view": true, "create": true, "edit": true, "delete": false},
        "payments": {"view": true, "create": true, "edit": true, "delete": false, "approve": true},
        "reports": {"view": true, "export": true, "view_financial": true},
        "settings": {"view": true, "edit": true}
    }'::jsonb,
    true
)
ON CONFLICT (ma_quyen) DO UPDATE 
SET 
    ten_quyen = EXCLUDED.ten_quyen,
    mo_ta = EXCLUDED.mo_ta,
    permissions = EXCLUDED.permissions,
    status = EXCLUDED.status;

-- Cập nhật admin user với role ADMIN
UPDATE sys_user 
SET role_id = (SELECT id FROM sys_role WHERE ma_quyen = 'ADMIN')
WHERE username = 'admin' OR id = 1;

-- Cập nhật các user khác về role mặc định (BAN_HANG nếu chưa có role)
UPDATE sys_user 
SET role_id = (SELECT id FROM sys_role WHERE ma_quyen = 'BAN_HANG')
WHERE role_id IS NULL AND username != 'admin';

-- Tạo index cho ma_quyen
CREATE INDEX IF NOT EXISTS idx_sys_role_ma_quyen ON sys_role(ma_quyen);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 035: Roles and permissions updated successfully';
    RAISE NOTICE 'Created roles: ADMIN, BAN_HANG, KHO, KE_TOAN, QUAN_LY';
END $$;
