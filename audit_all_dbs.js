require("dotenv").config();
const { Pool } = require("pg");

async function checkAllDBs() {
  const dbs = [
    "postgres",
    "Motorbikes",
    "Database",
    "manage_motor",
    "Manage_Warehouse",
  ];

  for (const db of dbs) {
    console.log(`--- Checking DB: ${db} ---`);
    const p = new Pool({
      host: "localhost",
      user: "postgres",
      password: "password",
      port: 5432,
      database: db,
    });

    try {
      const res = await p.query(`
         SELECT proname FROM pg_proc WHERE proname = 'fn_get_all_child_groups'
       `);
      if (res.rows.length > 0) {
        console.log(`  [FOUND] fn_get_all_child_groups exists in ${db}`);
      } else {
        console.log(`  [MISSING] fn_get_all_child_groups not in ${db}`);
      }
    } catch (err) {
      console.log(`  [ERROR] ${err.message}`);
    } finally {
      await p.end();
    }
  }
}

checkAllDBs();
