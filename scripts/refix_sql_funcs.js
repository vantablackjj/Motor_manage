require("dotenv").config();
const { pool } = require("./src/config/database");

async function fixPostgresFunctions() {
  const sql = `
    -- 1. Xóa tất cả các phiên bản cũ để tránh nhập nhằng
    DROP FUNCTION IF EXISTS get_nhom_hang_children(VARCHAR);
    DROP FUNCTION IF EXISTS get_nhom_hang_children(TEXT);
    DROP FUNCTION IF EXISTS get_nhom_hang_children_v2(VARCHAR);
    DROP FUNCTION IF EXISTS get_kho_children(VARCHAR);
    DROP FUNCTION IF EXISTS get_kho_children(TEXT);
    DROP FUNCTION IF EXISTS get_kho_children_v2(VARCHAR);

    -- 2. Tạo hàm bằng LANGUAGE SQL (ổn định hơn PL/pgSQL cho các truy vấn đệ quy đơn giản)
    -- Sử dụng kiểu TEXT cho tham số đầu vào để hỗ trợ tự động ép kiểu từ hằng số
    CREATE OR REPLACE FUNCTION get_nhom_hang_children(p_ma_nhom TEXT)
    RETURNS TABLE (ma_nhom VARCHAR) 
    LANGUAGE SQL
    STABLE
    AS $$
        WITH RECURSIVE nhom_tree AS (
            -- Anchor: lấy nhóm gốc
            SELECT n.ma_nhom::VARCHAR
            FROM dm_nhom_hang n
            WHERE n.ma_nhom = p_ma_nhom
            
            UNION ALL
            
            -- Recursive: lấy các con
            SELECT n.ma_nhom::VARCHAR
            FROM dm_nhom_hang n
            INNER JOIN nhom_tree nt ON n.ma_nhom_cha = nt.ma_nhom
        )
        SELECT nt.ma_nhom FROM nhom_tree nt;
    $$;

    -- 3. Tương tự cho kho
    CREATE OR REPLACE FUNCTION get_kho_children(p_ma_kho TEXT)
    RETURNS TABLE (ma_kho VARCHAR) 
    LANGUAGE SQL
    STABLE
    AS $$
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
    $$;
  `;
  try {
    await pool.query(sql);
    console.log(
      "Postgres functions RE-FIXED using LANGUAGE SQL for maximum stability.",
    );

    // Kiểm tra ngay lập tức
    const test1 = await pool.query(
      "SELECT ma_nhom FROM get_nhom_hang_children('XE') LIMIT 1",
    );
    console.log(
      "Test Nhóm Hàng OK:",
      test1.rows.length > 0 ? "Data found" : "No data but no error",
    );
  } catch (err) {
    console.error("ERROR during fix:", err.message);
  } finally {
    await pool.end();
  }
}

fixPostgresFunctions();
