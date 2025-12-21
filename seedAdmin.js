const bcrypt = require('bcrypt');
const { pool } = require('./src/config/database');

async function seedAdmin() {
  const username = 'admin';
  const password = 'Admin@123'; // đổi sau khi login
  const hash = await bcrypt.hash(password, 10);

  const check = await pool.query(
    'SELECT id FROM sys_user WHERE username = $1',
    [username]
  );

  if (check.rows.length > 0) {
    console.log('✅ Admin already exists');
    return;
  }

  await pool.query(
    `INSERT INTO sys_user (username, password, vai_tro, trang_thai)
     VALUES ($1, $2, 'ADMIN', TRUE)`,
    [username, hash]
  );

  console.log('🚀 Admin account created');
}

seedAdmin()
  .then(() => process.exit())
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
