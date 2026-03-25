require("dotenv").config();
const { pool } = require("./src/config/database");

async function migrate() {
  try {
    console.log("Starting migration...");
    
    // 1. Add ma_kho to tm_cong_no_doi_tac_ct
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_cong_no_doi_tac_ct' AND column_name = 'ma_kho') THEN
          ALTER TABLE tm_cong_no_doi_tac_ct ADD COLUMN ma_kho varchar(50);
          -- Mặc định gán các bản ghi cũ là KHO001 (tùy tình huống)
          UPDATE tm_cong_no_doi_tac_ct SET ma_kho = 'KHO001' WHERE ma_kho IS NULL;
        END IF;
      END $$;
    `);

    // 2. Add ma_kho to tm_cong_no_doi_tac (Summary)
    // We need to drop the old PK and add ma_kho to it
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_cong_no_doi_tac' AND column_name = 'ma_kho') THEN
          ALTER TABLE tm_cong_no_doi_tac ADD COLUMN ma_kho varchar(50);
          UPDATE tm_cong_no_doi_tac SET ma_kho = 'KHO001' WHERE ma_kho IS NULL;
          
          -- Drop and recreation only if needed
          ALTER TABLE tm_cong_no_doi_tac DROP CONSTRAINT IF EXISTS tm_cong_no_doi_tac_pkey;
          ALTER TABLE tm_cong_no_doi_tac ADD PRIMARY KEY (ma_doi_tac, loai_cong_no, ma_kho);
        END IF;
      END $$;
    `);

    // 3. Fix Internal Debt summary key (just in case)
    await pool.query(`
       ALTER TABLE tm_cong_no_noi_bo DROP CONSTRAINT IF EXISTS tm_cong_no_noi_bo_pkey;
       ALTER TABLE tm_cong_no_noi_bo ADD PRIMARY KEY (ma_kho_no, ma_kho_co);
    `).catch(() => {});

    const fs = require('fs');
    fs.writeFileSync('migration.log', "Migration completed successfully.");
    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (err) {
    const fs = require('fs');
    fs.writeFileSync('migration.log', "Migration failed: " + err.message);
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
