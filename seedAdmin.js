require('dotenv').config();

const bcrypt = require('bcryptjs');
const { pool } = require('./src/config/database');

async function seedAdmin() {
  const username = 'admin';
  const plainPassword = 'Admin@123';

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const exists = await pool.query(
    'SELECT id FROM sys_user WHERE username = $1',
    [username]
  );

  if (exists.rowCount > 0) {
    console.log('⚠️ Admin đã tồn tại, bỏ qua');
    process.exit(0);
  }

  await pool.query(
    `
    INSERT INTO sys_user (
      username,
      password,
      vai_tro,
      trang_thai,
      ngay_tao
    )
    VALUES ($1, $2, 'ADMIN', TRUE, NOW())
    `,
    [username, hashedPassword]
  );

  console.log('✅ Seed admin thành công');
  process.exit(0);
}

seedAdmin().catch(err => {
  console.error('❌ Seed admin lỗi:', err);
  process.exit(1);
});
