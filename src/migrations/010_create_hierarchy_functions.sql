-- =====================================================
-- MIGRATION 010: CREATE HIERARCHY FUNCTIONS
-- Description: Recursive functions for Groups and Warehouses
-- Author: ERP Architect
-- Date: 2026-01-27
-- =====================================================

-- 1. Function: Lấy toàn bộ mã nhóm con (đệ quy)
CREATE OR REPLACE FUNCTION get_nhom_hang_children(p_ma_nhom VARCHAR)
RETURNS TABLE (ma_nhom VARCHAR) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE nhom_tree AS (
        -- Anchor member
        SELECT n.ma_nhom
        FROM dm_nhom_hang n
        WHERE n.ma_nhom = p_ma_nhom
        
        UNION ALL
        
        -- Recursive member
        SELECT n.ma_nhom
        FROM dm_nhom_hang n
        INNER JOIN nhom_tree nt ON n.ma_nhom_cha = nt.ma_nhom
    )
    SELECT nt.ma_nhom FROM nhom_tree nt;
END;
$$;

-- 2. Function: Lấy đường dẫn phân cấp của nhóm (VD: XE > HONDA > WINNER)
CREATE OR REPLACE FUNCTION get_nhom_hang_path(p_ma_nhom VARCHAR)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_path TEXT;
BEGIN
    WITH RECURSIVE nhom_path AS (
        SELECT ma_nhom, ten_nhom, ma_nhom_cha, 1 as level
        FROM dm_nhom_hang
        WHERE ma_nhom = p_ma_nhom
        
        UNION ALL
        
        SELECT n.ma_nhom, n.ten_nhom, n.ma_nhom_cha, np.level + 1
        FROM dm_nhom_hang n
        INNER JOIN nhom_path np ON n.ma_nhom = np.ma_nhom_cha
    )
    SELECT string_agg(ten_nhom, ' > ' ORDER BY level DESC)
    INTO v_path
    FROM nhom_path;
    
    RETURN v_path;
END;
$$;

-- 3. Function: Lấy toàn bộ mã kho con (đệ quy)
CREATE OR REPLACE FUNCTION get_kho_children(p_ma_kho VARCHAR)
RETURNS TABLE (ma_kho VARCHAR) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE kho_tree AS (
        SELECT k.ma_kho
        FROM sys_kho k
        WHERE k.ma_kho = p_ma_kho
        
        UNION ALL
        
        SELECT k.ma_kho
        FROM sys_kho k
        INNER JOIN kho_tree kt ON k.ma_kho_cha = kt.ma_kho
    )
    SELECT kt.ma_kho FROM kho_tree kt;
END;
$$;

-- Success Message
DO $$
BEGIN
    RAISE NOTICE 'Migration 010: Hierarchy functions created successfully';
END $$;
