require("dotenv").config();
const { query } = require("./src/config/database");
const fs = require("fs");

async function checkBrands() {
  try {
    const res = await query(
      "SELECT ma_nhom, ten_nhom, ma_nhom_cha, status FROM dm_nhom_hang WHERE ten_nhom ILIKE '%Phanh%' OR ten_nhom ILIKE '%Lop%'",
    );
    fs.writeFileSync("brand_dump.json", JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkBrands();
