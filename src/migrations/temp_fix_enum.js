const { pool } = require("../config/database");

async function fixEnum() {
  const client = await pool.connect();
  try {
    console.log("Adding missing values to enum_trang_thai_don_hang...");
    
    // Check existing values first (optional, but good for idempotency)
    const result = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = 'enum_trang_thai_don_hang'::regtype
    `);
    const existingValues = result.rows.map(r => r.enumlabel);
    
    const valuesToAdd = ['GUI_DUYET', 'CHO_DUYET', 'TU_CHOI', 'DA_HUY'];
    
    for (const val of valuesToAdd) {
      if (!existingValues.includes(val)) {
        console.log(`Adding ${val}...`);
        // ALTER TYPE ADD VALUE cannot run in a transaction block
        await client.query(`ALTER TYPE enum_trang_thai_don_hang ADD VALUE '${val}'`);
      } else {
        console.log(`${val} already exists.`);
      }
    }
    
    console.log("Done!");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    client.release();
    process.exit();
  }
}

fixEnum();
