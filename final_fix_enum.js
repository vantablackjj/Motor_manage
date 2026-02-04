require("dotenv").config();
const { Pool } = require("pg");

async function run() {
  console.log("DATABASE_URL from .env:", process.env.DATABASE_URL);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const res = await pool.query("SELECT current_database()");
    console.log("Connected to database:", res.rows[0].current_database);

    // Add value if not exist
    // Note: We can use a DO block to be safer with 'IF NOT EXISTS' logic for older PG versions if needed,
    // but 9.4+ supports simple ALTER TYPE ... ADD VALUE.

    const checkRes = await pool.query(`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'enum_trang_thai_don_hang'
    `);

    const values = checkRes.rows.map((r) => r.enumlabel);
    console.log("Current values:", values);

    if (!values.includes("GUI_DUYET")) {
      await pool.query(
        "ALTER TYPE enum_trang_thai_don_hang ADD VALUE 'GUI_DUYET'",
      );
      console.log("Added GUI_DUYET");
    }

    if (!values.includes("DA_HUY")) {
      await pool.query(
        "ALTER TYPE enum_trang_thai_don_hang ADD VALUE 'DA_HUY'",
      );
      console.log("Added DA_HUY");
    }

    if (!values.includes("TU_CHOI")) {
      await pool.query(
        "ALTER TYPE enum_trang_thai_don_hang ADD VALUE 'TU_CHOI'",
      );
      console.log("Added TU_CHOI");
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

run();
