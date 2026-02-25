require("dotenv").config();
const { pool } = require("./src/config/database");

async function diagnoseAndFix() {
  const client = await pool.connect();
  try {
    console.log("🔍 Diagnosing User Roles...");

    // 1. Check sys_role table
    const rolesRes = await client.query("SELECT * FROM sys_role");
    console.log(
      "Existing Roles:",
      rolesRes.rows.map((r) => r.ten_quyen),
    );

    // 2. Check sys_user table
    const usersRes = await client.query(`
      SELECT u.id, u.username, u.role_id, r.ten_quyen 
      FROM sys_user u 
      LEFT JOIN sys_role r ON u.role_id = r.id
    `);

    console.log("\nUsers and their roles:");
    for (const u of usersRes.rows) {
      console.log(
        `- User: ${u.username}, RoleID: ${u.role_id}, RoleName: ${u.ten_quyen || "NULL"}`,
      );
    }

    // 3. Fix users with NULL roles (Default to NHAN_VIEN if not admin)
    console.log("\n🛠 Fixing users with NULL roles...");

    const adminRole = rolesRes.rows.find((r) => r.ten_quyen === "ADMIN");
    const nhanVienRole = rolesRes.rows.find((r) => r.ten_quyen === "NHAN_VIEN");

    if (!nhanVienRole) {
      console.log("❌ Error: NHAN_VIEN role not found in sys_role!");
      return;
    }

    // Update 'admin' user to be ADMIN
    await client.query(
      "UPDATE sys_user SET role_id = $1 WHERE username = 'admin' AND role_id IS NULL",
      [adminRole.id],
    );

    // Update others to NHAN_VIEN
    await client.query(
      "UPDATE sys_user SET role_id = $1 WHERE role_id IS NULL",
      [nhanVienRole.id],
    );

    console.log("✅ Fix completed!");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

diagnoseAndFix();
