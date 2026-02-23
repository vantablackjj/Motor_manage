require("dotenv").config();
const { pool } = require("./src/config/database");
const fs = require("fs");

async function checkIndex() {
  const { rows } = await pool.query(`
    SELECT
        i.relname as index_name,
        a.attname as column_name,
        ix.indisunique as is_unique
    FROM
        pg_class t,
        pg_class i,
        pg_index ix,
        pg_attribute a
    WHERE
        t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND a.attrelid = t.oid
        AND a.attnum = ANY(ix.indkey)
        AND t.relkind = 'r'
        AND t.relname = 'sys_role'
  `);
  fs.writeFileSync("sys_role_indices.json", JSON.stringify(rows, null, 2));
  console.log("Written to sys_role_indices.json");
  await pool.end();
}

checkIndex();
