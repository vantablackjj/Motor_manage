-- =====================================================
-- MIGRATION: ADD KY_THUAT ROLE
-- Description: Thêm vai trò Kỹ thuật viên (KY_THUAT) cho thợ sửa chữa
-- =====================================================

DO $$
BEGIN
    -- Check if role already exists
    IF NOT EXISTS (SELECT 1 FROM sys_role WHERE ma_quyen = 'KY_THUAT') THEN
        INSERT INTO sys_role (ma_quyen, ten_quyen, mo_ta, permissions, status)
        VALUES (
            'KY_THUAT',
            'Kỹ thuật viên',
            'Thợ sửa máy/kỹ thuật viên, chỉ có quyền xem và cập nhật trạng thái sửa chữa',
            '{
                "users":           {"view": false, "create": false, "edit": false, "delete": false},
                "roles":           {"view": false, "create": false, "edit": false, "delete": false},
                "warehouses":      {"view": false, "create": false, "edit": false, "delete": false},
                "products":        {"view": true,  "create": false, "edit": false, "delete": false, "approve": false, "view_cost": false},
                "partners":        {"view": false, "create": false, "edit": false, "delete": false},
                "purchase_orders": {"view": false, "create": false, "edit": false, "delete": false, "approve": false},
                "sales_orders":    {"view": false, "create": false, "edit": false, "delete": false, "approve": false},
                "invoices":        {"view": false, "create": false, "edit": false, "delete": false},
                "inventory":       {"view": false, "import": false, "export": false, "transfer": false, "adjust": false},
                "debt":            {"view": false, "create": false, "edit": false, "delete": false},
                "payments":        {"view": false, "create": false, "edit": false, "delete": false, "approve": false},
                "reports":         {"view": false, "export": false, "view_financial": false},
                "settings":        {"view": false, "edit": false},
                "maintenance":     {"view": true,  "create": true,  "edit": true,  "delete": false}
            }'::jsonb,
            true
        );
    END IF;
    
    RAISE NOTICE 'Role KY_THUAT added successfully';
END $$;
