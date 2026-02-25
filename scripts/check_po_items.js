require("dotenv").config();
const { pool } = require("./src/config/database");
const fs = require("fs");

async function checkPOItems() {
  const pos = ["PO20260210000016", "PO20260209000010", "PO20260209000011"];
  const res = await pool.query(
    `
    SELECT ct.so_don_hang, ct.ma_hang_hoa, pt.ten_hang_hoa, pt.ma_nhom_hang
    FROM tm_don_hang_chi_tiet ct
    JOIN tm_hang_hoa pt ON ct.ma_hang_hoa = pt.ma_hang_hoa
    WHERE ct.so_don_hang = ANY($1)
  `,
    [pos],
  );

  fs.writeFileSync("po_items.json", JSON.stringify(res.rows, null, 2));
  await pool.end();
}

checkPOItems();
