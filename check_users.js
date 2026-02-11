require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkUsers() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT u.id, u.username, u.role_id, r.ten_quyen 
      FROM sys_user u 
      LEFT JOIN sys_role r ON u.role_id = r.id
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

checkUsers();
