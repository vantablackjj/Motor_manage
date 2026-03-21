-- Fix missing authorities and aliases
INSERT INTO sys_authority (ma_authority, ten_authority, nhom_authority)
VALUES 
    ('don_hang_ban_xe.view', 'Xem đơn bán xe', 'don_hang_ban_xe'),
    ('don_hang_ban_xe.create', 'Tạo đơn bán xe', 'don_hang_ban_xe'),
    ('don_hang_ban_xe.edit', 'Sửa đơn bán xe', 'don_hang_ban_xe'),
    ('don_hang_ban_xe.delete', 'Xóa đơn bán xe', 'don_hang_ban_xe'),
    ('don_hang_ban_xe.approve', 'Duyệt đơn bán xe', 'don_hang_ban_xe'),
    ('don_hang_mua_xe.view', 'Xem đơn mua xe', 'don_hang_mua_xe'),
    ('don_hang_mua_xe.create', 'Tạo đơn mua xe', 'don_hang_mua_xe'),
    ('don_hang_mua_xe.edit', 'Sửa đơn mua xe', 'don_hang_mua_xe'),
    ('don_hang_mua_xe.delete', 'Xóa đơn mua xe', 'don_hang_mua_xe'),
    ('don_hang_mua_xe.approve', 'Duyệt đơn mua xe', 'don_hang_mua_xe')
ON CONFLICT (ma_authority) DO NOTHING;

-- Synchronize roles mapping based on their aliases if one is already set
-- e.g. If a role has sales_orders.view, give it don_hang_ban_xe.view too
INSERT INTO sys_role_authority (role_id, authority_id)
SELECT ra.role_id, a_new.id
FROM sys_role_authority ra
JOIN sys_authority a_old ON ra.authority_id = a_old.id
JOIN sys_authority a_new ON (
    (a_old.ma_authority LIKE 'sales_orders.%' AND a_new.ma_authority = 'don_hang_ban_xe.' || split_part(a_old.ma_authority, '.', 2))
    OR
    (a_old.ma_authority LIKE 'don_hang_ban_xe.%' AND a_new.ma_authority = 'sales_orders.' || split_part(a_old.ma_authority, '.', 2))
    OR
    (a_old.ma_authority LIKE 'purchase_orders.%' AND a_new.ma_authority = 'don_hang_mua_xe.' || split_part(a_old.ma_authority, '.', 2))
    OR
    (a_old.ma_authority LIKE 'don_hang_mua_xe.%' AND a_new.ma_authority = 'purchase_orders.' || split_part(a_old.ma_authority, '.', 2))
)
ON CONFLICT DO NOTHING;
