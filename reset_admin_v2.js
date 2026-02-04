require("dotenv").config();
const { pool } = require("./src/config/database");
const bcrypt = require("bcryptjs");

async function resetAdmin() {
  try {
    const password = "admin123";
    const hash = await bcrypt.hash(password, 10);

    // Kiểm tra role Quản trị viên
    const roleRes = await pool.query(
      "SELECT id FROM sys_role WHERE ten_quyen = 'Quản trị viên' OR ten_quyen = 'ADMIN' LIMIT 1",
    );
    if (roleRes.rowCount === 0) {
      console.log("Role ADMIN not found.");
      return;
    }
    const roleId = roleRes.rows[0].id;

    // Cập nhật hoặc chèn admin
    await pool.query(
      `
      INSERT INTO sys_user (username, password_hash, ho_ten, role_id, status)
      VALUES ('admin', $1, 'Administrator', $2, TRUE)
      ON CONFLICT (username) DO UPDATE SET password_hash = $1, role_id = $2, status = TRUE
    `,
      [hash, roleId],
    );

    console.log("---SUCCESS---");
    console.log("Username: admin");
    console.log("Password:", password);
    console.log("---END---");
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
resetAdmin();
