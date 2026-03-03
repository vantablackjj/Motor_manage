require("dotenv").config();
const { pool } = require("./src/config/database");

async function check() {
  const t = await pool.query("SHOW TIMEZONE");
  const n = await pool.query("SELECT NOW()");
  const d = await pool.query("SELECT CURRENT_DATE");
  const n2 = await pool.query(
    "SELECT NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh' as ict_now",
  );

  console.log("DB Timezone:", t.rows[0].TimeZone);
  console.log("DB Now:", n.rows[0].now);
  console.log("DB Today (UTC):", d.rows[0].current_date);
  console.log("DB Now (ICT):", n2.rows[0].ict_now);

  process.exit(0);
}
check();
