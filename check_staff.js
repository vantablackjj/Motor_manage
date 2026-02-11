require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkStaff() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT u.id, u.username, u.role_id, r.ten_quyen 
      FROM sys_user u 
      LEFT JOIN sys_role r ON u.role_id = r.id
      WHERE u.username = 'Staff'
    `);
    console.log("Staff User:", res.rows[0]);
  } finally {
    client.release();
    await pool.end();
  }
}

checkStaff();
