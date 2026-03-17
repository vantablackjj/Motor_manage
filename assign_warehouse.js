require("dotenv").config();
const { pool } = require("./src/config/database");
async function run() {
  try {
    const res = await pool.query(
      "UPDATE sys_user SET ma_kho = 'KHO01' WHERE username = 'dat '",
    );
    console.log("Updated user dat with warehouse KHO01");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
