require("dotenv").config();
const { pool } = require("./src/config/database");
async function run() {
  try {
    const res = await pool.query(
      "SELECT ma_quyen, permissions->'payments' as payments_perm FROM sys_role WHERE ma_quyen IN ('BAN_HANG', 'KHO')",
    );
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
