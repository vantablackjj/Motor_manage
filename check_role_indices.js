require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkIndex() {
  const { rows } = await pool.query(`
    SELECT
        t.relname as table_name,
        i.relname as index_name,
        a.attname as column_name
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
  console.log(rows);
  await pool.end();
}

checkIndex();
