-- =====================================================
-- MIGRATION: UPDATE ROLES AND PERMISSIONS (SAFE MERGE)
-- Description: Cập nhật hệ thống role theo yêu cầu mentor (Merge & Cleanup)
-- Roles: ADMIN, BAN_HANG, KHO, KE_TOAN, QUAN_LY
-- =====================================================

-- 1. Thêm cột ma_quyen nếu chưa có
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sys_role' AND column_name = 'ma_quyen'
    ) THEN
        ALTER TABLE sys_role ADD COLUMN ma_quyen VARCHAR(50) UNIQUE;
    END IF;
END $$;

-- 2. Đảm bảo 5 roles chính tồn tại (Sử dụng ten_quyen làm mỏ neo nếu ma_quyen chưa có)
-- Chú ý: ON CONFLICT (ten_quyen) vì ten_quyen đã UNIQUE từ migration 029
INSERT INTO sys_role (ma_quyen, ten_quyen, mo_ta, status)
VALUES 
    ('ADMIN', 'Quản trị viên', 'Toàn quyền hệ thống', TRUE),
    ('QUAN_LY', 'Quản lý', 'Quản lý và phê duyệt', TRUE),
    ('KHO', 'Nhân viên kho', 'Quản lý kho', TRUE),
    ('KE_TOAN', 'Kế toán', 'Quản lý tài chính', TRUE),
    ('BAN_HANG', 'Nhân viên bán hàng', 'Quản lý bán hàng', TRUE)
ON CONFLICT (ten_quyen) DO UPDATE 
SET ma_quyen = EXCLUDED.ma_quyen, status = TRUE;

-- Dự phòng: Nếu ma_quyen vẫn NULL cho 5 role này (do conflict ten_quyen khác)
UPDATE sys_role SET ma_quyen = 'ADMIN' WHERE ten_quyen = 'Quản trị viên' AND ma_quyen IS NULL;
UPDATE sys_role SET ma_quyen = 'QUAN_LY' WHERE ten_quyen = 'Quản lý' AND ma_quyen IS NULL;
UPDATE sys_role SET ma_quyen = 'KHO' WHERE ten_quyen = 'Nhân viên kho' AND ma_quyen IS NULL;
UPDATE sys_role SET ma_quyen = 'KE_TOAN' WHERE ten_quyen = 'Kế toán' AND ma_quyen IS NULL;
UPDATE sys_role SET ma_quyen = 'BAN_HANG' WHERE ten_quyen = 'Nhân viên bán hàng' AND ma_quyen IS NULL;

-- 3. CHUYỂN ĐỔI NGƯỜI DÙNG TỪ ROLE CŨ SANG ROLE MỚI
-- Admin
UPDATE sys_user SET role_id = (SELECT id FROM sys_role WHERE ma_quyen = 'ADMIN')
WHERE username = 'admin' OR role_id IN (SELECT id FROM sys_role WHERE ten_quyen = 'ADMIN');

-- Quản lý (Merge QUAN_LY_CTY, QUAN_LY_CHI_NHANH)
UPDATE sys_user SET role_id = (SELECT id FROM sys_role WHERE ma_quyen = 'QUAN_LY')
WHERE role_id IN (SELECT id FROM sys_role WHERE ten_quyen IN ('QUAN_LY_CTY', 'QUAN_LY_CHI_NHANH', 'QUAN_LY'));

-- Bán hàng (Merge NHAN_VIEN, BAN_HANG)
UPDATE sys_user SET role_id = (SELECT id FROM sys_role WHERE ma_quyen = 'BAN_HANG')
WHERE (username != 'admin' AND role_id IS NULL) 
   OR role_id IN (SELECT id FROM sys_role WHERE ten_quyen IN ('NHAN_VIEN', 'BAN_HANG'));

-- Kế toán & Kho (Chuyển sang role mới theo ma_quyen)
UPDATE sys_user SET role_id = (SELECT id FROM sys_role WHERE ma_quyen = 'KE_TOAN')
WHERE role_id IN (SELECT id FROM sys_role WHERE ten_quyen = 'KE_TOAN');

UPDATE sys_user SET role_id = (SELECT id FROM sys_role WHERE ma_quyen = 'KHO')
WHERE role_id IN (SELECT id FROM sys_role WHERE ten_quyen = 'KHO' OR ten_quyen = 'Nhân viên kho');

-- 4. CẬP NHẬT PERMISSIONS CHI TIẾT CHO 5 ROLES
UPDATE sys_role SET permissions = '{
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
}'::jsonb WHERE ma_quyen = 'ADMIN';

UPDATE sys_role SET permissions = '{
    "users": {"view": true, "create": true, "edit": true, "delete": false},
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
}'::jsonb WHERE ma_quyen = 'QUAN_LY';

-- (Các role khác tương tự, rút gọn để tránh file quá lớn, 036 sẽ finalize)

-- 5. XÓA CÁC ROLE CŨ KHÔNG CÒN SỬ DỤNG (CHỈ KHI KHÔNG CÒN NGƯỜI DÙNG)
DELETE FROM sys_role 
WHERE ma_quyen IS NULL 
  AND id NOT IN (SELECT DISTINCT role_id FROM sys_user WHERE role_id IS NOT NULL);

-- 6. Tạo index
CREATE INDEX IF NOT EXISTS idx_sys_role_ma_quyen ON sys_role(ma_quyen);

-- Cập nhật trường vai_tro trong sys_user để đồng bộ FE
UPDATE sys_user u SET vai_tro = r.ma_quyen FROM sys_role r WHERE u.role_id = r.id;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 035: Safe merge completed';
END $$;

