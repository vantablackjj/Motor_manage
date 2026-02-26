const { Client } = require("pg");
const client = new Client({
  connectionString:
    "postgresql://root:b2eTdDCxM6E5HR8D44cMW3IhbAtxW7Hc@dpg-d61auqh4tr6s73c6nmng-a.oregon-postgres.render.com/motor_manage_db_1rg0",
  ssl: { rejectUnauthorized: false },
});

async function check() {
  await client.connect();
  try {
    const res = await client.query(
      "INSERT INTO tm_hang_hoa_serial (ma_serial, ma_hang_hoa, serial_identifier, trang_thai, la_xe_cua_hang, ghi_chu) VALUES ('TTT', 'XE_NGOAI', 'TTT', 'TON_KHO', FALSE, 'test')",
    );
    console.log("Success tm_hang_hoa_serial inserted", res.rowCount);
  } catch (e) {
    console.error(e.message);
  } finally {
    await client.end();
  }
}
check();
