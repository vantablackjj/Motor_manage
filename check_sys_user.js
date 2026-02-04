require("dotenv").config();
const { pool } = require("./src/config/database");

async function run() {
  try {
    const res = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'sys_user'",
    );
    console.log("---BEGIN---");
    res.rows.forEach((r) => console.log(r.column_name));
    console.log("---END---");
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
