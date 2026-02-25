require("dotenv").config();
const { pool } = require("./src/config/database");

async function recreateFunctions() {
  const sql = `
    -- Drop existing functions
    DROP FUNCTION IF EXISTS get_nhom_hang_children(VARCHAR);
    DROP FUNCTION IF EXISTS get_kho_children(VARCHAR);

    -- Create get_nhom_hang_children with exact types
    CREATE OR REPLACE FUNCTION get_nhom_hang_children(p_ma_nhom VARCHAR)
    RETURNS TABLE (ma_nhom VARCHAR) 
    LANGUAGE plpgsql
    AS $$
    BEGIN
        RETURN QUERY
        WITH RECURSIVE nhom_tree AS (
            SELECT n.ma_nhom::VARCHAR
            FROM dm_nhom_hang n
            WHERE n.ma_nhom = p_ma_nhom
            
            UNION ALL
            
            SELECT n.ma_nhom::VARCHAR
            FROM dm_nhom_hang n
            INNER JOIN nhom_tree nt ON n.ma_nhom_cha = nt.ma_nhom
        )
        SELECT nt.ma_nhom FROM nhom_tree nt;
    END;
    $$;

    -- Create get_kho_children with exact types
    CREATE OR REPLACE FUNCTION get_kho_children(p_ma_kho VARCHAR)
    RETURNS TABLE (ma_kho VARCHAR) 
    LANGUAGE plpgsql
    AS $$
    BEGIN
        RETURN QUERY
        WITH RECURSIVE kho_tree AS (
            SELECT k.ma_kho::VARCHAR
            FROM sys_kho k
            WHERE k.ma_kho = p_ma_kho
            
            UNION ALL
            
            SELECT k.ma_kho::VARCHAR
            FROM sys_kho k
            INNER JOIN kho_tree kt ON k.ma_kho_cha = kt.ma_kho
        )
        SELECT kt.ma_kho FROM kho_tree kt;
    END;
    $$;
  `;
  try {
    await pool.query(sql);
    console.log(
      "Functions dropped and recreated successfully with explicit VARCHAR types.",
    );
  } catch (err) {
    console.error("Error during recreation:", err.message);
  } finally {
    await pool.end();
  }
}

recreateFunctions();
