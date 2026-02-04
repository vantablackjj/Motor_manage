require("dotenv").config();

const bcrypt = require("bcryptjs");
const { pool } = require("./src/config/database");

async function seedAdmin() {
  const username = "admin";
  const plainPassword = "Admin@123";

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const exists = await pool.query(
    "SELECT id FROM sys_user WHERE username = $1",
    [username],
  );

  if (exists.rowCount > 0) {
    console.log("⚠️ Admin đã tồn tại, bỏ qua");
    process.exit(0);
  }

  // Get ADMIN role id
  const roleResult = await pool.query(
    "SELECT id FROM sys_role WHERE ten_quyen = 'ADMIN'",
  );
  if (roleResult.rowCount === 0) {
    console.error("❌ Không tìm thấy quyền ADMIN. Hãy chạy migration trước.");
    process.exit(1);
  }
  const roleId = roleResult.rows[0].id;

  await pool.query(
    `
    INSERT INTO sys_user (
      username,
      password_hash,
      role_id,
      status,
      created_at
    )
    VALUES ($1, $2, $3, TRUE, NOW())
    `,
    [username, hashedPassword, roleId],
  );

  console.log("✅ Seed admin thành công");
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("❌ Seed admin lỗi:", err);
  process.exit(1);
});
