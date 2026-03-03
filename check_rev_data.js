require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkData() {
  const client = await pool.connect();
  try {
    const today = new Date().toISOString().split("T")[0];
    console.log("Checking data for today:", today);

    const mRes = await client.query(`
      SELECT ma_phieu, ma_serial, tong_tien, trang_thai, thoi_gian_ket_thuc, ma_kho
      FROM tm_bao_tri
      WHERE trang_thai = 'HOAN_THANH'
      ORDER BY thoi_gian_ket_thuc DESC LIMIT 5
    `);
    console.log("Recently Completed Maintenance:", mRes.rows);

    const cRes = await client.query(`
      SELECT so_phieu_tc, so_tien, trang_thai, loai_phieu, ngay_giao_dich, ma_kho
      FROM tm_phieu_thu_chi
      WHERE loai_phieu = 'THU'
      ORDER BY created_at DESC LIMIT 5
    `);
    console.log("Recent Cash Collection Receipts:", cRes.rows);

    const hRes = await client.query(`
      SELECT so_hoa_don, thanh_tien, trang_thai, ngay_hoa_don, ma_ben_xuat
      FROM tm_hoa_don
      WHERE loai_hoa_don = 'BAN_HANG'
      ORDER BY ngay_hoa_don DESC LIMIT 5
    `);
    console.log("Recent Sale Invoices:", hRes.rows);

    // Run the dashboard revenue query manually to see what it returns
    const sql = `
      SELECT SUM(total) as total FROM (
        SELECT SUM(thanh_tien) as total FROM tm_hoa_don WHERE trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO', 'DA_XUAT') AND loai_hoa_don = 'BAN_HANG' AND ngay_hoa_don::date = $1
        UNION ALL
        SELECT SUM(tong_tien) as total FROM tm_bao_tri WHERE trang_thai = 'HOAN_THANH' AND thoi_gian_ket_thuc::date = $1
      ) t
    `;
    const dRes = await client.query(sql, [today]);
    console.log("Dashboard Revenue Query Result for Today:", dRes.rows[0]);

    client.release();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkData();
