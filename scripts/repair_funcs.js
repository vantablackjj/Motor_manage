require("dotenv").config();
const { pool } = require("./src/config/database");

async function fixFunctions() {
  const sql = `
    -- Drop both old and new to clear any ambiguity
    DROP FUNCTION IF EXISTS get_nhom_hang_children(VARCHAR);
    DROP FUNCTION IF EXISTS get_nhom_hang_children_v2(VARCHAR);
    DROP FUNCTION IF EXISTS get_kho_children(VARCHAR);
    DROP FUNCTION IF EXISTS get_kho_children_v2(VARCHAR);

    -- Create robust version of get_nhom_hang_children using TEXT (matches unknown literals better)
    CREATE OR REPLACE FUNCTION get_nhom_hang_children(p_ma_nhom TEXT)
    RETURNS TABLE (ma_nhom VARCHAR)
    LANGUAGE plpgsql
    STABLE
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

    -- Create robust version of get_kho_children using TEXT
    CREATE OR REPLACE FUNCTION get_kho_children(p_ma_kho TEXT)
    RETURNS TABLE (ma_kho VARCHAR)
    LANGUAGE plpgsql
    STABLE
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
      "Functions REPAIRED successfully (TEXT signatures, TABLE returns).",
    );
  } catch (err) {
    console.error("Error repairing functions:", err.message);
  } finally {
    await pool.end();
  }
}

fixFunctions();
