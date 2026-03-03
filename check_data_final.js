require("dotenv").config();
const { pool } = require("./src/config/database");

async function run() {
  try {
    const res = await pool.query(`
      SELECT ma_phieu, tong_tien, (thoi_gian_ket_thuc::date)::text as finish_date
      FROM tm_bao_tri 
      WHERE trang_thai = 'HOAN_THANH'
      ORDER BY thoi_gian_ket_thuc DESC LIMIT 5
    `);
    const res2 = await pool.query(`
      SELECT so_phieu_tc, so_tien, (ngay_giao_dich::date)::text as trans_date
      FROM tm_phieu_thu_chi
      WHERE loai_phieu = 'THU' AND trang_thai = 'DA_DUYET'
      ORDER BY ngay_giao_dich DESC LIMIT 5
    `);
    const resTime = await pool.query(
      "SELECT NOW() as now, CURRENT_DATE as today",
    );

    const output = {
      maintenance: res.rows,
      receipts: res2.rows,
      time: resTime.rows[0],
    };

    console.log("DATA_START");
    console.log(JSON.stringify(output, null, 2));
    console.log("DATA_END");

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
