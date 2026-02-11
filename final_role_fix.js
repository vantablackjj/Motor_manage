require("dotenv").config();
const { pool } = require("./src/config/database");

async function finalFix() {
  const client = await pool.connect();
  try {
    console.log("🚀 Final Role Fix Strategy...");

    // 1. Ensure all Roles exist
    const roles = [
      ["ADMIN", "Quản trị viên"],
      ["QUAN_LY_CTY", "Quản lý công ty"],
      ["QUAN_LY_CHI_NHANH", "Quản lý chi nhánh"],
      ["NHAN_VIEN", "Nhân viên"],
      ["KHO", "Nhân viên kho"],
    ];

    for (const [name, desc] of roles) {
      await client.query(
        `INSERT INTO sys_role (ten_quyen, mo_ta, status)
         VALUES ($1, $2, true)
         ON CONFLICT (ten_quyen) DO UPDATE SET mo_ta = $2`,
        [name, desc],
      );
    }

    // 2. Map existing users to roles if they are NULL
    // First, find the IDs
    const roleMap = {};
    const res = await client.query("SELECT id, ten_quyen FROM sys_role");
    res.rows.forEach((r) => (roleMap[r.ten_quyen] = r.id));

    console.log("Role Map:", roleMap);

    // Update 'admin' to ADMIN
    if (roleMap["ADMIN"]) {
      await client.query(
        "UPDATE sys_user SET role_id = $1 WHERE username = 'admin'",
        [roleMap["ADMIN"]],
      );
    }

    // Update 'Staff' to NHAN_VIEN
    if (roleMap["NHAN_VIEN"]) {
      // Find 'Staff' user case-insensitively just in case
      await client.query(
        "UPDATE sys_user SET role_id = $1 WHERE UPPER(username) = 'STAFF' OR id = 3",
        [roleMap["NHAN_VIEN"]],
      );
    }

    // Any others to NHAN_VIEN
    if (roleMap["NHAN_VIEN"]) {
      await client.query(
        "UPDATE sys_user SET role_id = $1 WHERE role_id IS NULL",
        [roleMap["NHAN_VIEN"]],
      );
    }

    console.log("✅ All users updated with roles!");
  } catch (error) {
    console.error("❌ Fix failed:", error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

finalFix();
