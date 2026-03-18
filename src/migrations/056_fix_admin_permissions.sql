-- Migration 056: Fix Admin Role and Permissions
-- Ensure Admin user has the correct role and the role has full permissions

DO $$
DECLARE
    admin_role_id INTEGER;
BEGIN
    -- 1. Ensure the ADMIN role exists with ma_quyen = 'ADMIN'
    SELECT id INTO admin_role_id FROM sys_role WHERE ma_quyen = 'ADMIN';
    
    IF admin_role_id IS NULL THEN
        -- If ma_quyen doesn't exist, try ten_quyen
        SELECT id INTO admin_role_id FROM sys_role WHERE ten_quyen = 'ADMIN' OR ten_quyen = 'Quản trị viên';
    END IF;

    IF admin_role_id IS NULL THEN
        -- Create the role if it doesn't exist at all
        INSERT INTO sys_role (ma_quyen, ten_quyen, status) 
        VALUES ('ADMIN', 'Quản trị viên', TRUE) RETURNING id INTO admin_role_id;
    ELSE
        -- Update existing role to have the correct ma_quyen and ten_quyen
        UPDATE sys_role SET ma_quyen = 'ADMIN', ten_quyen = 'Quản trị viên', status = TRUE WHERE id = admin_role_id;
    END IF;

    -- 2. Grant full permissions to the ADMIN role
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
    }'::jsonb WHERE id = admin_role_id;

    -- 3. Ensure the 'admin' user is linked to this role
    UPDATE sys_user SET role_id = admin_role_id, vai_tro = 'ADMIN' WHERE username = 'admin';

    RAISE NOTICE 'Fixing admin permissions completed, role_id: %', admin_role_id;
END $$;
