require("dotenv").config();
const { pool } = require("./src/config/database");

async function createV2Functions() {
  const sql = `
    -- V2 Function: Get product group children (Returns SETOF for better plan stability)
    CREATE OR REPLACE FUNCTION get_nhom_hang_children_v2(p_ma_nhom VARCHAR)
    RETURNS SETOF VARCHAR
    LANGUAGE plpgsql
    AS $$
    BEGIN
        RETURN QUERY
        WITH RECURSIVE nhom_tree AS (
            SELECT n.ma_nhom::VARCHAR as m
            FROM dm_nhom_hang n
            WHERE n.ma_nhom = p_ma_nhom
            
            UNION ALL
            
            SELECT n.ma_nhom::VARCHAR
            FROM dm_nhom_hang n
            INNER JOIN nhom_tree nt ON n.ma_nhom_cha = nt.m
        )
        SELECT m FROM nhom_tree;
    END;
    $$;

    -- V2 Function: Get warehouse children
    CREATE OR REPLACE FUNCTION get_kho_children_v2(p_ma_kho VARCHAR)
    RETURNS SETOF VARCHAR
    LANGUAGE plpgsql
    AS $$
    BEGIN
        RETURN QUERY
        WITH RECURSIVE kho_tree AS (
            SELECT k.ma_kho::VARCHAR as m
            FROM sys_kho k
            WHERE k.ma_kho = p_ma_kho
            
            UNION ALL
            
            SELECT k.ma_kho::VARCHAR
            FROM sys_kho k
            INNER JOIN kho_tree kt ON k.ma_kho_cha = kt.m
        )
        SELECT m FROM kho_tree;
    END;
    $$;
  `;
  try {
    await pool.query(sql);
    console.log("V2 functions created successfully (SETOF VARCHAR).");
  } catch (err) {
    console.error("Error creating V2 functions:", err.message);
  } finally {
    await pool.end();
  }
}

createV2Functions();
