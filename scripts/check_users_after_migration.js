require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkUsers() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT u.id, u.username, u.role_id, r.ten_quyen 
      FROM sys_user u 
      LEFT JOIN sys_role r ON u.role_id = r.id 
      ORDER BY u.id
    `);

    console.log("Users after migration:");
    res.rows.forEach((u) => {
      console.log(
        `  ${u.username}: ${u.ten_quyen || "NULL"} (role_id: ${u.role_id})`,
      );
    });
  } finally {
    client.release();
    await pool.end();
  }
}

checkUsers();
