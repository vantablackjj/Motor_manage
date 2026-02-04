const { query } = require("./src/config/database");

async function checkBrands() {
  try {
    const res = await query(
      "SELECT ma_nhom, ten_nhom, ma_nhom_cha, status FROM dm_nhom_hang ORDER BY ma_nhom_cha, ma_nhom",
    );
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  }
}

checkBrands();
