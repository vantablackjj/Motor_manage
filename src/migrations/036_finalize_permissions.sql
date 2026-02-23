-- =====================================================
-- MIGRATION 036: FINALIZE ROLE PERMISSIONS
-- Description: Cập nhật đầy đủ permissions cho 5 roles
-- Roles: ADMIN, BAN_HANG, KHO, KE_TOAN, QUAN_LY
-- Date: 2026-02-23
-- =====================================================

-- Đảm bảo cột ma_quyen đã tồn tại trong sys_role và vai_tro trong sys_user
DO $$
BEGIN
    -- Thêm ma_quyen vào sys_role
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sys_role' AND column_name = 'ma_quyen'
    ) THEN
        ALTER TABLE sys_role ADD COLUMN ma_quyen VARCHAR(50) UNIQUE;
    END IF;

    -- Thêm vai_tro vào sys_user
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sys_user' AND column_name = 'vai_tro'
    ) THEN
        ALTER TABLE sys_user ADD COLUMN vai_tro VARCHAR(50);
    END IF;
END $$;

-- =====================================================
-- Upsert đầy đủ 5 roles với permissions chi tiết
-- =====================================================

-- Đồng bộ ma_quyen cho các role cũ dựa trên ten_quyen trước khi UPSERT
-- Việc này giúp tránh lỗi UNIQUE constraint trên ten_quyen khi INSERT
UPDATE sys_role SET ma_quyen = 'ADMIN' WHERE (ten_quyen = 'Quản trị viên' OR ten_quyen = 'ADMIN') AND ma_quyen IS NULL;
UPDATE sys_role SET ma_quyen = 'KHO' WHERE (ten_quyen = 'KHO' OR ten_quyen = 'Nhân viên kho') AND ma_quyen IS NULL;
UPDATE sys_role SET ma_quyen = 'KE_TOAN' WHERE (ten_quyen = 'KE_TOAN' OR ten_quyen = 'Kế toán') AND ma_quyen IS NULL;
UPDATE sys_role SET ma_quyen = 'BAN_HANG' WHERE (ten_quyen = 'BAN_HANG' OR ten_quyen = 'Nhân viên bán hàng' OR ten_quyen = 'NHAN_VIEN') AND ma_quyen IS NULL;
UPDATE sys_role SET ma_quyen = 'QUAN_LY' WHERE (ten_quyen = 'QUAN_LY' OR ten_quyen = 'Quản lý' OR ten_quyen = 'QUAN_LY_CTY' OR ten_quyen = 'QUAN_LY_CHI_NHANH') AND ma_quyen IS NULL;

-- ADMIN: Toàn quyền hệ thống
INSERT INTO sys_role (ma_quyen, ten_quyen, mo_ta, permissions, status)
VALUES (
    'ADMIN',
    'Quản trị viên',
    'Toàn quyền quản trị hệ thống - không bị giới hạn bất kỳ chức năng nào',
    '{
        "users":           {"view": true,  "create": true,  "edit": true,  "delete": true},
        "roles":           {"view": true,  "create": true,  "edit": true,  "delete": true},
        "warehouses":      {"view": true,  "create": true,  "edit": true,  "delete": true},
        "products":        {"view": true,  "create": true,  "edit": true,  "delete": true,  "approve": true, "view_cost": true},
        "partners":        {"view": true,  "create": true,  "edit": true,  "delete": true},
        "purchase_orders": {"view": true,  "create": true,  "edit": true,  "delete": true,  "approve": true},
        "sales_orders":    {"view": true,  "create": true,  "edit": true,  "delete": true,  "approve": true},
        "invoices":        {"view": true,  "create": true,  "edit": true,  "delete": true},
        "inventory":       {"view": true,  "import": true,  "export": true, "transfer": true, "adjust": true},
        "debt":            {"view": true,  "create": true,  "edit": true,  "delete": true},
        "payments":        {"view": true,  "create": true,  "edit": true,  "delete": true,  "approve": true},
        "reports":         {"view": true,  "export": true,  "view_financial": true},
        "settings":        {"view": true,  "edit": true}
    }'::jsonb,
    true
)
ON CONFLICT (ma_quyen) DO UPDATE
SET
    ten_quyen   = EXCLUDED.ten_quyen,
    mo_ta       = EXCLUDED.mo_ta,
    permissions = EXCLUDED.permissions,
    status      = EXCLUDED.status;

-- BAN_HANG: Nhân viên bán hàng
-- Quyền hạn: Xem hàng hóa, khách hàng, tạo đơn hàng/hóa đơn, xem tồn kho.
-- Hạn chế: Không xem giá nhập, không xóa dữ liệu, không quản lý nhân sự.
INSERT INTO sys_role (ma_quyen, ten_quyen, mo_ta, permissions, status)
VALUES (
    'BAN_HANG',
    'Nhân viên bán hàng',
    'Quản lý đơn bán hàng, hóa đơn và thông tin khách hàng',
    '{
        "users":           {"view": false, "create": false, "edit": false, "delete": false},
        "roles":           {"view": false, "create": false, "edit": false, "delete": false},
        "warehouses":      {"view": true,  "create": false, "edit": false, "delete": false},
        "products":        {"view": true,  "create": false, "edit": false, "delete": false, "approve": false, "view_cost": false},
        "partners":        {"view": true,  "create": true,  "edit": true,  "delete": false},
        "purchase_orders": {"view": false, "create": false, "edit": false, "delete": false, "approve": false},
        "sales_orders":    {"view": true,  "create": true,  "edit": true,  "delete": false, "approve": false},
        "invoices":        {"view": true,  "create": true,  "edit": true,  "delete": false},
        "inventory":       {"view": true,  "import": false, "export": true, "transfer": false, "adjust": false},
        "debt":            {"view": true,  "create": true,  "edit": false, "delete": false},
        "payments":        {"view": true,  "create": true,  "edit": false, "delete": false, "approve": false},
        "reports":         {"view": true,  "export": true,  "view_financial": false},
        "settings":        {"view": false, "edit": false}
    }'::jsonb,
    true
)
ON CONFLICT (ma_quyen) DO UPDATE
SET
    ten_quyen   = EXCLUDED.ten_quyen,
    mo_ta       = EXCLUDED.mo_ta,
    permissions = EXCLUDED.permissions,
    status      = EXCLUDED.status;

-- KHO: Nhân viên kho
-- Quyền hạn: Quản lý hàng hóa, kho bãi, nhập/xuất/chuyển kho, tạo đơn mua.
-- Hạn chế: Không xem báo cáo tài chính, không xóa đối tác hay hóa đơn.
INSERT INTO sys_role (ma_quyen, ten_quyen, mo_ta, permissions, status)
VALUES (
    'KHO',
    'Nhân viên kho',
    'Quản lý nhập xuất kho, chuyển kho và theo dõi tồn kho hàng hóa',
    '{
        "users":           {"view": false, "create": false, "edit": false, "delete": false},
        "roles":           {"view": false, "create": false, "edit": false, "delete": false},
        "warehouses":      {"view": true,  "create": true,  "edit": true,  "delete": false},
        "products":        {"view": true,  "create": true,  "edit": true,  "delete": false, "approve": false, "view_cost": true},
        "partners":        {"view": true,  "create": true,  "edit": true,  "delete": false},
        "purchase_orders": {"view": true,  "create": true,  "edit": true,  "delete": false, "approve": false},
        "sales_orders":    {"view": true,  "create": false, "edit": false, "delete": false, "approve": false},
        "invoices":        {"view": true,  "create": true,  "edit": false, "delete": false},
        "inventory":       {"view": true,  "import": true,  "export": true, "transfer": true, "adjust": true},
        "debt":            {"view": false, "create": false, "edit": false, "delete": false},
        "payments":        {"view": false, "create": false, "edit": false, "delete": false, "approve": false},
        "reports":         {"view": true,  "export": true,  "view_financial": false},
        "settings":        {"view": false, "edit": false}
    }'::jsonb,
    true
)
ON CONFLICT (ma_quyen) DO UPDATE
SET
    ten_quyen   = EXCLUDED.ten_quyen,
    mo_ta       = EXCLUDED.mo_ta,
    permissions = EXCLUDED.permissions,
    status      = EXCLUDED.status;

-- KE_TOAN: Kế toán
-- Quyền hạn: Quản lý tiền tệ, công nợ, hóa đơn, báo cáo tài chính.
-- Có quyền xem chi phí (view_cost) và duyệt thanh toán/đơn hàng.
INSERT INTO sys_role (ma_quyen, ten_quyen, mo_ta, permissions, status)
VALUES (
    'KE_TOAN',
    'Kế toán',
    'Quản lý tài chính, công nợ, thu chi và báo cáo tài chính',
    '{
        "users":           {"view": true,  "create": false, "edit": false, "delete": false},
        "roles":           {"view": false, "create": false, "edit": false, "delete": false},
        "warehouses":      {"view": true,  "create": false, "edit": false, "delete": false},
        "products":        {"view": true,  "create": false, "edit": true,  "delete": false, "approve": false, "view_cost": true},
        "partners":        {"view": true,  "create": true,  "edit": true,  "delete": false},
        "purchase_orders": {"view": true,  "create": true,  "edit": true,  "delete": false, "approve": true},
        "sales_orders":    {"view": true,  "create": false, "edit": true,  "delete": false, "approve": true},
        "invoices":        {"view": true,  "create": true,  "edit": true,  "delete": false},
        "inventory":       {"view": true,  "import": true,  "export": true, "transfer": false, "adjust": false},
        "debt":            {"view": true,  "create": true,  "edit": true,  "delete": true},
        "payments":        {"view": true,  "create": true,  "edit": true,  "delete": true,  "approve": true},
        "reports":         {"view": true,  "export": true,  "view_financial": true},
        "settings":        {"view": true,  "edit": false}
    }'::jsonb,
    true
)
ON CONFLICT (ma_quyen) DO UPDATE
SET
    ten_quyen   = EXCLUDED.ten_quyen,
    mo_ta       = EXCLUDED.mo_ta,
    permissions = EXCLUDED.permissions,
    status      = EXCLUDED.status;

-- QUAN_LY: Quản lý
-- Giám sát toàn hệ thống, phê duyệt các đơn hàng và thanh toán.
-- Hạn chế quyền xóa hệ thống so với Admin.
INSERT INTO sys_role (ma_quyen, ten_quyen, mo_ta, permissions, status)
VALUES (
    'QUAN_LY',
    'Quản lý',
    'Giám sát tổng thể, phê duyệt các nghiệp vụ và xem báo cáo tài chính',
    '{
        "users":           {"view": true,  "create": true,  "edit": true,  "delete": false},
        "roles":           {"view": true,  "create": false, "edit": false, "delete": false},
        "warehouses":      {"view": true,  "create": true,  "edit": true,  "delete": false},
        "products":        {"view": true,  "create": true,  "edit": true,  "delete": false, "approve": true, "view_cost": true},
        "partners":        {"view": true,  "create": true,  "edit": true,  "delete": true},
        "purchase_orders": {"view": true,  "create": true,  "edit": true,  "delete": false, "approve": true},
        "sales_orders":    {"view": true,  "create": true,  "edit": true,  "delete": false, "approve": true},
        "invoices":        {"view": true,  "create": true,  "edit": true,  "delete": false},
        "inventory":       {"view": true,  "import": true,  "export": true, "transfer": true, "adjust": true},
        "debt":            {"view": true,  "create": true,  "edit": true,  "delete": false},
        "payments":        {"view": true,  "create": true,  "edit": true,  "delete": false, "approve": true},
        "reports":         {"view": true,  "export": true,  "view_financial": true},
        "settings":        {"view": true,  "edit": true}
    }'::jsonb,
    true
)
ON CONFLICT (ma_quyen) DO UPDATE
SET
    ten_quyen   = EXCLUDED.ten_quyen,
    mo_ta       = EXCLUDED.mo_ta,
    permissions = EXCLUDED.permissions,
    status      = EXCLUDED.status;


-- =====================================================
-- Gán role mặc định cho users chưa có role
-- =====================================================

-- Admin -> ADMIN role
UPDATE sys_user
SET role_id = (SELECT id FROM sys_role WHERE ma_quyen = 'ADMIN')
WHERE (username = 'admin' OR id = 1)
  AND role_id IS NULL;

-- Users khác chưa có role -> BAN_HANG
UPDATE sys_user
SET role_id = (SELECT id FROM sys_role WHERE ma_quyen = 'BAN_HANG')
WHERE role_id IS NULL AND username != 'admin';

-- =====================================================
-- Cập nhật trường vai_tro trong sys_user để đồng bộ
-- =====================================================
UPDATE sys_user u
SET vai_tro = r.ma_quyen
FROM sys_role r
WHERE u.role_id = r.id
  AND (u.vai_tro IS NULL OR u.vai_tro != r.ma_quyen);

-- Index
CREATE INDEX IF NOT EXISTS idx_sys_role_ma_quyen ON sys_role(ma_quyen);

-- Success
DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Migration 036: Role permissions finalized!';
    RAISE NOTICE 'Roles:';
    RAISE NOTICE '  ADMIN    - Full access';
    RAISE NOTICE '  BAN_HANG - Sales & customer management';
    RAISE NOTICE '  KHO      - Warehouse & inventory management';
    RAISE NOTICE '  KE_TOAN  - Finance, debt & financial reports';
    RAISE NOTICE '  QUAN_LY  - Full oversight & approval authority';
    RAISE NOTICE '================================================';
END $$;
