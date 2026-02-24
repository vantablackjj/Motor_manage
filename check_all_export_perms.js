require("dotenv").config();
const { pool } = require("./src/config/database");

async function check() {
  const { rows } = await pool.query(
    "SELECT ma_quyen, permissions FROM sys_role WHERE ma_quyen IN ('BAN_HANG', 'KHO')",
  );
  rows.forEach((r) => {
    console.log(`Role: ${r.ma_quyen}`);
    Object.entries(r.permissions).forEach(([mod, perms]) => {
      if (perms.export !== undefined) {
        console.log(`  ${mod}.export: ${perms.export}`);
      }
    });
  });
  await pool.end();
}

check();
