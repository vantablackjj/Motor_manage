require("dotenv").config();
const { Pool } = require("pg");

const sql = `
    CREATE OR REPLACE FUNCTION fn_get_all_child_groups(p_root_code TEXT)
    RETURNS TABLE (group_code VARCHAR) 
    LANGUAGE SQL STABLE AS $$
        WITH RECURSIVE tree AS (
            SELECT n.ma_nhom::VARCHAR
            FROM dm_nhom_hang n
            WHERE n.ma_nhom = p_root_code
            UNION ALL
            SELECT n.ma_nhom::VARCHAR
            FROM dm_nhom_hang n
            INNER JOIN tree t ON n.ma_nhom_cha = t.ma_nhom
        )
        SELECT ma_nhom FROM tree;
    $$;

    CREATE OR REPLACE FUNCTION fn_get_all_child_warehouses(p_root_code TEXT)
    RETURNS TABLE (warehouse_code VARCHAR) 
    LANGUAGE SQL STABLE AS $$
        WITH RECURSIVE tree AS (
            SELECT k.ma_kho::VARCHAR
            FROM sys_kho k
            WHERE k.ma_kho = p_root_code
            UNION ALL
            SELECT k.ma_kho::VARCHAR
            FROM sys_kho k
            INNER JOIN tree t ON k.ma_kho_cha = t.ma_kho
        )
        SELECT ma_kho FROM tree;
    $$;

    CREATE OR REPLACE FUNCTION fn_get_group_path_text(p_code TEXT)
    RETURNS TEXT LANGUAGE PLPGSQL STABLE AS $$
    DECLARE
        v_path TEXT;
    BEGIN
        WITH RECURSIVE path_tree AS (
            SELECT ma_nhom, ten_nhom, ma_nhom_cha, 1 as level
            FROM dm_nhom_hang
            WHERE ma_nhom = p_code
            UNION ALL
            SELECT n.ma_nhom, n.ten_nhom, n.ma_nhom_cha, pt.level + 1
            FROM dm_nhom_hang n
            INNER JOIN path_tree pt ON n.ma_nhom = pt.ma_nhom_cha
        )
        SELECT string_agg(ten_nhom, ' > ' ORDER BY level DESC)
        INTO v_path
        FROM path_tree;
        RETURN v_path;
    END;
    $$;
`;

async function syncAll() {
  const dbs = [
    "postgres",
    "Motorbikes",
    "Database",
    "manage_motor",
    "Manage_Warehouse",
  ];
  for (const db of dbs) {
    console.log(`Syncing ${db}...`);
    const p = new Pool({
      host: "localhost",
      user: "postgres",
      password: "password",
      port: 5432,
      database: db,
    });
    try {
      await p.query(sql);
      console.log(`  [OK] ${db}`);
    } catch (err) {
      console.log(`  [ERROR] ${db}: ${err.message}`);
    } finally {
      await p.end();
    }
  }
}

syncAll();
