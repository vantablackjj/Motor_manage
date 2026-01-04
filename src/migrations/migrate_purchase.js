require("dotenv").config();
const { pool } = require("./src/config/database");

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Starting migration...");
    await client.query("BEGIN");

    // 1. ALTER tm_don_hang_mua_xe_ct
    // Check if column da_nhap_kho exists
    const checkCol = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='tm_don_hang_mua_xe_ct' AND column_name='da_nhap_kho'
    `);

    if (checkCol.rows.length > 0) {
      console.log("Dropping da_nhap_kho and adding so_luong_da_nhan...");
      await client.query(`
        ALTER TABLE tm_don_hang_mua_xe_ct 
        DROP COLUMN da_nhap_kho,
        ADD COLUMN so_luong_da_nhan INTEGER DEFAULT 0
      `);
    } else {
      // Double check if so_luong_da_nhan exists
      const checkNewCol = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='tm_don_hang_mua_xe_ct' AND column_name='so_luong_da_nhan'
        `);
      if (checkNewCol.rows.length === 0) {
        console.log("Adding so_luong_da_nhan...");
        await client.query(`
                ALTER TABLE tm_don_hang_mua_xe_ct 
                ADD COLUMN so_luong_da_nhan INTEGER DEFAULT 0
            `);
      }
    }

    // 2. Add HOAN_THANH to status check constraint if it uses one,
    // or just ensure we can use it.
    try {
      await client.query(`
            ALTER TABLE tm_don_hang_mua_xe 
            DROP CONSTRAINT IF EXISTS tm_don_hang_mua_xe_trang_thai_check
        `);
      await client.query(`
            ALTER TABLE tm_don_hang_mua_xe 
            ADD CONSTRAINT tm_don_hang_mua_xe_trang_thai_check 
            CHECK (trang_thai IN ('NHAP', 'GUI_DUYET', 'DA_DUYET', 'DA_HUY', 'HOAN_THANH', 'DANG_NHAP'))
        `);
      // Note: added DANG_NHAP also as I used it in the service code
    } catch (e) {
      console.log(
        "Constraint update might have failed or not needed, ignoring:",
        e.message
      );
    }

    await client.query("COMMIT");
    console.log("Migration completed successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
  } finally {
    client.release();
    // Use process.exit explicitly to close pool
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
}

migrate();
