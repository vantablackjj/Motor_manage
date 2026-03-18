-- 057_rbac_v2_authorities.sql
-- Migration from JSONB-based roles to Granular Authority-based RBAC

-- 1. Create Authorities table
CREATE TABLE IF NOT EXISTS sys_authority (
    id SERIAL PRIMARY KEY,
    ma_authority VARCHAR(100) UNIQUE NOT NULL, -- Internal code: e.g. 'users.view'
    ten_authority VARCHAR(255),               -- Readable name: e.g. 'Xem người dùng'
    nhom_authority VARCHAR(100),              -- Resource group: e.g. 'users'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Role-Authority mapping table
CREATE TABLE IF NOT EXISTS sys_role_authority (
    role_id INT REFERENCES sys_role(id) ON DELETE CASCADE,
    authority_id INT REFERENCES sys_authority(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, authority_id)
);

-- 3. Create User-Role mapping table (to allow multiple roles per user)
CREATE TABLE IF NOT EXISTS sys_user_role (
    user_id INT REFERENCES sys_user(id) ON DELETE CASCADE,
    role_id INT REFERENCES sys_role(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 4. Initial seed for Authorities from current permissions JSON logic
-- Refactored to use declarative INSERT SELECT for better compatibility

-- 4.1 Populate sys_user_role from current sys_user.role_id
INSERT INTO sys_user_role (user_id, role_id)
SELECT id, role_id FROM sys_user WHERE role_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4.2 Populate Authorities
INSERT INTO sys_authority (ma_authority, ten_authority, nhom_authority)
SELECT DISTINCT 
    key || '.' || sub_key as ma_authority,
    INITCAP(key) || ' ' || sub_key as ten_authority,
    key as nhom_authority
FROM sys_role r
CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(r.permissions) = 'object' THEN r.permissions ELSE '{}'::jsonb END) as p(key, val)
CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(val) = 'object' THEN val ELSE '{}'::jsonb END) as s(sub_key, sub_val)
WHERE (sub_val::text = 'true' OR sub_val::text = '1')
ON CONFLICT (ma_authority) DO NOTHING;

-- 4.3 Map Roles to Authorities
INSERT INTO sys_role_authority (role_id, authority_id)
SELECT r.id, a.id
FROM sys_role r
CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(r.permissions) = 'object' THEN r.permissions ELSE '{}'::jsonb END) as p(key, val)
CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(val) = 'object' THEN val ELSE '{}'::jsonb END) as s(sub_key, sub_val),
     sys_authority a
WHERE (sub_val::text = 'true' OR sub_val::text = '1')
  AND a.ma_authority = key || '.' || sub_key
ON CONFLICT DO NOTHING;

-- 5. Add useful indexes
CREATE INDEX IF NOT EXISTS idx_sys_user_role_user ON sys_user_role(user_id);
CREATE INDEX IF NOT EXISTS idx_sys_role_authority_role ON sys_role_authority(role_id);
