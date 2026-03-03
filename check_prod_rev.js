const { Pool } = require("pg");

const prodUrl =
  "postgresql://root:b2eTdDCxM6E5HR8D44cMW3IhbAtxW7Hc@dpg-d61auqh4tr6s73c6nmng-a/motor_manage_db_1rg0";

async function run() {
  const pool = new Pool({
    connectionString: prodUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("Checking PRODUCTION database...");

    const today = new Date().toISOString().split("T")[0];
    const todayLocal = new Date(new Date().getTime() + 7 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    console.log("Date filters - UTC:", today, "| Local (+7):", todayLocal);

    // 1. Maintenance
    const btRes = await pool.query(`
      SELECT ma_phieu, tong_tien, trang_thai, thoi_gian_ket_thuc::text, 
             (thoi_gian_ket_thuc AT TIME ZONE 'UTC' AT TIME ZONE 'ICT')::date::text as local_date
      FROM tm_bao_tri 
      WHERE updated_at >= NOW() - INTERVAL '2 days'
      ORDER BY updated_at DESC
    `);
    console.log(
      "\nRecent Maintenance (Production):",
      JSON.stringify(btRes.rows, null, 2),
    );

    // 2. Phieu Thu
    const ptcRes = await pool.query(`
      SELECT so_phieu_tc, so_tien, loai_phieu, trang_thai, ngay_giao_dich::text,
             (ngay_giao_dich AT TIME ZONE 'UTC' AT TIME ZONE 'ICT')::date::text as local_date
      FROM tm_phieu_thu_chi
      WHERE created_at >= NOW() - INTERVAL '2 days'
      ORDER BY created_at DESC
    `);
    console.log(
      "\nRecent Phieu Thu (Production):",
      JSON.stringify(ptcRes.rows, null, 2),
    );

    // 3. Test the exact dashboard query logic
    const testDate = todayLocal;
    const dashQuery = `
      SELECT SUM(total) as total FROM (
        SELECT SUM(thanh_tien) as total FROM tm_hoa_don 
        WHERE trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO', 'DA_XUAT') 
          AND loai_hoa_don = 'BAN_HANG' 
          AND ngay_hoa_don::date = $1
        UNION ALL
        SELECT SUM(tong_tien) as total FROM tm_bao_tri 
        WHERE trang_thai = 'HOAN_THANH' 
          AND thoi_gian_ket_thuc::date = $1
      ) t
    `;
    const dashRes = await pool.query(dashQuery, [testDate]);
    console.log(
      `\nDashboard Revenue Query result for ${testDate}:`,
      dashRes.rows[0],
    );

    await pool.end();
  } catch (err) {
    console.error("Error connecting to production:", err);
  }
}

run();
