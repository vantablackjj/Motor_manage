require("dotenv").config();
const { pool } = require("./src/config/database");

async function testQuery() {
  try {
    // Test the EXACT query from baoCao.service.js
    const tu_ngay = "2026-02-01";
    const den_ngay = "2026-02-10";

    const result = await pool.query(
      `
      SELECT 
        ls.*, 
        COALESCE(k_xuat.ten_kho, ncc_nhap.ten_doi_tac) as kho_xuat, 
        COALESCE(k_nhap.ten_kho, kh_ban.ten_doi_tac) as kho_nhap,
        pt.ten_hang_hoa as ten_loai, 
        (x.thuoc_tinh_rieng->>'ten_mau') as ten_mau
      FROM tm_hang_hoa_lich_su ls
      LEFT JOIN sys_kho k_xuat ON ls.ma_kho_xuat = k_xuat.ma_kho
      LEFT JOIN tm_don_hang po ON ls.so_chung_tu = po.so_don_hang 
      LEFT JOIN dm_doi_tac ncc_nhap ON po.ma_ben_xuat = ncc_nhap.ma_doi_tac
      LEFT JOIN sys_kho k_nhap ON ls.ma_kho_nhap = k_nhap.ma_kho
      LEFT JOIN tm_hoa_don hd ON ls.so_chung_tu = hd.so_hoa_don 
      LEFT JOIN dm_doi_tac kh_ban ON hd.ma_ben_nhap = kh_ban.ma_doi_tac
      LEFT JOIN tm_hang_hoa_serial x ON ls.ma_serial = x.ma_serial
      JOIN tm_hang_hoa pt ON ls.ma_hang_hoa = pt.ma_hang_hoa
      WHERE (pt.ma_nhom_hang IN (SELECT ma_nhom FROM get_nhom_hang_children('XE')) OR pt.ma_nhom_hang = 'XE')
        AND ls.ngay_giao_dich >= $1
        AND ls.ngay_giao_dich < ($2::date + 1)
      ORDER BY ls.ngay_giao_dich DESC
    `,
      [tu_ngay, den_ngay],
    );

    console.log(`Total rows returned: ${result.rows.length}`);

    if (result.rows.length > 0) {
      console.log("\nFirst 3 rows:");
      result.rows.slice(0, 3).forEach((r, i) => {
        console.log(`\nRow ${i + 1}:`);
        console.log(`  so_chung_tu: ${r.so_chung_tu}`);
        console.log(`  loai_giao_dich: ${r.loai_giao_dich}`);
        console.log(`  ngay_giao_dich: ${r.ngay_giao_dich}`);
        console.log(`  kho_xuat: ${r.kho_xuat}`);
        console.log(`  kho_nhap: ${r.kho_nhap}`);
        console.log(`  ten_loai: ${r.ten_loai}`);
      });
    } else {
      console.log("\nNo rows found!");

      // Debug: Check without date filter
      const debugResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM tm_hang_hoa_lich_su ls
        JOIN tm_hang_hoa pt ON ls.ma_hang_hoa = pt.ma_hang_hoa
        WHERE (pt.ma_nhom_hang IN (SELECT ma_nhom FROM get_nhom_hang_children('XE')) OR pt.ma_nhom_hang = 'XE')
      `);
      console.log(
        `Total XE records (no date filter): ${debugResult.rows[0].count}`,
      );
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

testQuery();
