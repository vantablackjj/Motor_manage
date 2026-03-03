require("dotenv").config();
const { pool } = require("./src/config/database");

async function run() {
  try {
    const res = await pool.query(`
      SELECT ma_phieu, trang_thai, thoi_gian_ket_thuc, created_at, 
             extract(day from thoi_gian_ket_thuc) as d,
             extract(month from thoi_gian_ket_thuc) as m,
             extract(year from thoi_gian_ket_thuc) as y
      FROM tm_bao_tri 
      WHERE trang_thai = 'HOAN_THANH'
      ORDER BY thoi_gian_ket_thuc DESC LIMIT 10
    `);
    console.log("Completed Maintenance records:");
    console.log(JSON.stringify(res.rows, null, 2));

    const resNow = await pool.query("SELECT NOW(), CURRENT_DATE");
    console.log("DB Time info:", resNow.rows[0]);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
