require("dotenv").config();
const { pool } = require("./src/config/database");
const fs = require("fs");

async function testReport() {
  const filters = { tu_ngay: "2026-02-01", den_ngay: "2026-02-10" };
  const { tu_ngay, den_ngay, ma_kho, loai_giao_dich } = filters;

  let sql = `
      SELECT 
        ls.*, 
        COALESCE(k_xuat.ten_kho, ncc_nhap.ten_doi_tac) as kho_xuat, 
        COALESCE(k_nhap.ten_kho, kh_ban.ten_doi_tac) as kho_nhap,
        pt.ten_hang_hoa as ten_loai, 
        (x.thuoc_tinh_rieng->>'ten_mau') as ten_mau
      FROM tm_hang_hoa_lich_su ls
      -- Determines Source (Warehouse or Supplier)
      LEFT JOIN sys_kho k_xuat ON ls.ma_kho_xuat = k_xuat.ma_kho
      LEFT JOIN tm_don_hang po ON ls.so_chung_tu = po.so_don_hang 
      LEFT JOIN dm_doi_tac ncc_nhap ON po.ma_ben_xuat = ncc_nhap.ma_doi_tac
      
      -- Determines Destination (Warehouse or Customer)
      LEFT JOIN sys_kho k_nhap ON ls.ma_kho_nhap = k_nhap.ma_kho
      LEFT JOIN tm_hoa_don hd ON ls.so_chung_tu = hd.so_hoa_don 
      LEFT JOIN dm_doi_tac kh_ban ON hd.ma_ben_nhap = kh_ban.ma_doi_tac

      LEFT JOIN tm_hang_hoa_serial x ON ls.ma_serial = x.ma_serial
      JOIN tm_hang_hoa pt ON ls.ma_hang_hoa = pt.ma_hang_hoa
      WHERE (pt.ma_nhom_hang IN (SELECT ma_nhom FROM get_nhom_hang_children('XE')) OR pt.ma_nhom_hang = 'XE')
    `;
  const params = [];
  if (tu_ngay) {
    params.push(tu_ngay);
    sql += ` AND ls.ngay_giao_dich >= $${params.length}`;
  }
  if (den_ngay) {
    params.push(den_ngay);
    sql += ` AND ls.ngay_giao_dich < ($${params.length}::date + 1)`;
  }

  console.log("SQL:", sql);
  console.log("Params:", params);

  const res = await pool.query(sql, params);
  console.log("Result count:", res.rows.length);
  fs.writeFileSync("report_test.json", JSON.stringify(res.rows, null, 2));
  await pool.end();
}

testReport();
