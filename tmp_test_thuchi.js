const { pool } = require("./src/config/database");

async function test() {
  try {
    console.log("--- Testing Admin View (No ma_kho filter) ---");
    const resAdmin = await pool.query(
      "SELECT id, so_phieu_tc as so_phieu, ma_kho FROM tm_phieu_thu_chi LIMIT 5"
    );
    console.log("Admin Results:", resAdmin.rows);

    console.log("\n--- Testing Manage View (ma_kho = ['KHO001', 'KHO002']) ---");
    const warehouses = ["KHO001", "KHO002"];
    const resManage = await pool.query(
      "SELECT id, so_phieu_tc as so_phieu, ma_kho FROM tm_phieu_thu_chi WHERE ma_kho = ANY($1::text[]) LIMIT 5",
      [warehouses]
    );
    console.log("Manage Results:", resManage.rows);

    console.log("\n--- Testing Singular Match (ma_kho = 'KHO001') ---");
    const resSingular = await pool.query(
      "SELECT id, so_phieu_tc as so_phieu, ma_kho FROM tm_phieu_thu_chi WHERE ma_kho = $1 LIMIT 5",
      ["KHO001"]
    );
    console.log("Singular Results:", resSingular.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

test();
