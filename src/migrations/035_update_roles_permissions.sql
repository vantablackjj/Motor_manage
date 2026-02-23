-- =====================================================
-- MIGRATION: UPDATE ROLES AND PERMISSIONS (ULTRA SAFE MERGE)
-- Description: Gộp và chuẩn hóa hệ thống role, xử lý triệt để lỗi Unique Constraint
-- =====================================================

-- 1. Đảm bảo cột ma_quyen tồn tại trong sys_role và vai_tro trong sys_user
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

-- 2. Khối xử lý gộp role thông minh
DO $$
DECLARE
    r RECORD;
    target_id INTEGER;
BEGIN
    -- Định nghĩa danh sách các role mục tiêu và các tên tương ứng để chuẩn hóa
    -- Cấu trúc: ma_quyen, ten_chuan, danh_sach_ten_cu
    FOR r IN 
        SELECT 'ADMIN' as m, 'Quản trị viên' as t, ARRAY['ADMIN', 'Quản trị viên'] as olds
        UNION ALL SELECT 'QUAN_LY', 'Quản lý', ARRAY['QUAN_LY', 'Quản lý', 'QUAN_LY_CTY', 'QUAN_LY_CHI_NHANH']
        UNION ALL SELECT 'KHO', 'Nhân viên kho', ARRAY['KHO', 'Nhân viên kho']
        UNION ALL SELECT 'KE_TOAN', 'Kế toán', ARRAY['KE_TOAN', 'Kế toán']
        UNION ALL SELECT 'BAN_HANG', 'Nhân viên bán hàng', ARRAY['BAN_HANG', 'Nhân viên bán hàng', 'NHAN_VIEN']
    LOOP
        -- Tìm ID của role mục tiêu (ưu tiên theo ma_quyen, sau đó đến ten_quyen chuẩn)
        SELECT id INTO target_id FROM sys_role WHERE ma_quyen = r.m;
        
        IF target_id IS NULL THEN
            SELECT id INTO target_id FROM sys_role WHERE ten_quyen = r.t;
        END IF;

        -- Nếu chưa tồn tại bất kỳ bản ghi nào, tạo mới
        IF target_id IS NULL THEN
            INSERT INTO sys_role (ma_quyen, ten_quyen, status) 
            VALUES (r.m, r.t, TRUE) RETURNING id INTO target_id;
        ELSE
            -- Nếu đã tồn tại, cập nhật mã và tên chuẩn
            UPDATE sys_role SET ma_quyen = r.m, ten_quyen = r.t, status = TRUE WHERE id = target_id;
        END IF;

        -- CHUYỂN NGƯỜI DÙNG: Tìm tất cả các role "cũ" khác mà có trùng tên
        -- Chuyển người dùng từ các role đó sang target_id
        UPDATE sys_user 
        SET role_id = target_id 
        WHERE role_id IN (
            SELECT id FROM sys_role 
            WHERE (ten_quyen = ANY(r.olds) OR ma_quyen = r.m)
            AND id != target_id
        );

        -- XÓA ROLE CŨ: Sau khi đã chuyển người dùng, xóa các bản ghi trùng lặp
        DELETE FROM sys_role 
        WHERE (ten_quyen = ANY(r.olds) OR ma_quyen = r.m)
        AND id != target_id;
    END LOOP;
END $$;

-- 3. Cập nhật Permissions chi tiết cho 5 Roles chính
-- Admin
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

-- Các role khác (Sẽ được 036 bổ sung chi tiết hơn, ở đây gán cơ bản)
UPDATE sys_role SET permissions = '{"all": {"view": true}}'::jsonb WHERE ma_quyen != 'ADMIN' AND (permissions IS NULL OR permissions = '{}'::jsonb);

-- 4. Đồng bộ hóa lại trường vai_tro trong sys_user
UPDATE sys_user u SET vai_tro = r.ma_quyen FROM sys_role r WHERE u.role_id = r.id;

-- 5. Đảm bảo Admin user luôn có role ADMIN
UPDATE sys_user SET role_id = (SELECT id FROM sys_role WHERE ma_quyen = 'ADMIN') WHERE username = 'admin';

-- 6. Index
CREATE INDEX IF NOT EXISTS idx_sys_role_ma_quyen ON sys_role(ma_quyen);

DO $$
BEGIN
    RAISE NOTICE 'Migration 035: Standardization completed successfully';
END $$;

