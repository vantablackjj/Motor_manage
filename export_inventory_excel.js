require("dotenv").config();
const { Pool } = require("pg");
const XLSX = require("xlsx");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function exportInventoryMovements() {
  try {
    console.log("🔍 Đang thu thập dữ liệu nhập xuất...\n");

    // 1. Lịch sử nhập xuất tổng hợp
    console.log("📊 Sheet 1: Lịch sử giao dịch tổng hợp");
    const historyQuery = `
      SELECT 
        ls.id as "ID",
        ls.ngay_giao_dich as "Ngày giao dịch",
        ls.loai_giao_dich as "Loại giao dịch",
        ls.so_chung_tu as "Số chứng từ",
        pt.ma_hang_hoa as "Mã hàng",
        pt.ten_hang_hoa as "Tên hàng",
        pt.ma_nhom_hang as "Nhóm",
        ls.ma_serial as "Serial",
        COALESCE(k_xuat.ten_kho, ncc.ten_doi_tac) as "Từ",
        COALESCE(k_nhap.ten_kho, kh.ten_doi_tac) as "Đến",
        ls.so_luong as "Số lượng",
        ls.don_gia as "Đơn giá",
        ls.thanh_tien as "Thành tiền",
        ls.nguoi_thuc_hien as "Người thực hiện",
        ls.dien_giai as "Diễn giải"
      FROM tm_hang_hoa_lich_su ls
      LEFT JOIN tm_hang_hoa pt ON ls.ma_hang_hoa = pt.ma_hang_hoa
      LEFT JOIN sys_kho k_xuat ON ls.ma_kho_xuat = k_xuat.ma_kho
      LEFT JOIN sys_kho k_nhap ON ls.ma_kho_nhap = k_nhap.ma_kho
      LEFT JOIN tm_don_hang po ON ls.so_chung_tu = po.so_don_hang
      LEFT JOIN dm_doi_tac ncc ON po.ma_ben_xuat = ncc.ma_doi_tac
      LEFT JOIN tm_hoa_don hd ON ls.so_chung_tu = hd.so_hoa_don
      LEFT JOIN dm_doi_tac kh ON hd.ma_ben_nhap = kh.ma_doi_tac
      ORDER BY ls.ngay_giao_dich DESC, ls.id DESC
    `;
    const historyResult = await pool.query(historyQuery);
    console.log(`   ✓ ${historyResult.rows.length} giao dịch`);

    // 2. Nhập kho (từ nhà cung cấp)
    console.log("📊 Sheet 2: Nhập kho từ NCC");
    const importQuery = `
      SELECT 
        ls.id as "ID",
        ls.ngay_giao_dich as "Ngày nhập",
        ls.so_chung_tu as "Số PO",
        ncc.ten_doi_tac as "Nhà cung cấp",
        k.ten_kho as "Kho nhập",
        pt.ma_hang_hoa as "Mã hàng",
        pt.ten_hang_hoa as "Tên hàng",
        ls.ma_serial as "Serial",
        ls.so_luong as "Số lượng",
        ls.don_gia as "Đơn giá",
        ls.thanh_tien as "Thành tiền"
      FROM tm_hang_hoa_lich_su ls
      JOIN tm_hang_hoa pt ON ls.ma_hang_hoa = pt.ma_hang_hoa
      LEFT JOIN sys_kho k ON ls.ma_kho_nhap = k.ma_kho
      LEFT JOIN tm_don_hang po ON ls.so_chung_tu = po.so_don_hang
      LEFT JOIN dm_doi_tac ncc ON po.ma_ben_xuat = ncc.ma_doi_tac
      WHERE ls.loai_giao_dich IN ('NHAP_KHO', 'NHAP_MUA')
      ORDER BY ls.ngay_giao_dich DESC
    `;
    const importResult = await pool.query(importQuery);
    console.log(`   ✓ ${importResult.rows.length} phiếu nhập`);

    // 3. Xuất bán
    console.log("📊 Sheet 3: Xuất bán hàng");
    const salesQuery = `
      SELECT 
        ls.id as "ID",
        ls.ngay_giao_dich as "Ngày bán",
        ls.so_chung_tu as "Số hóa đơn",
        kh.ten_doi_tac as "Khách hàng",
        k.ten_kho as "Kho xuất",
        pt.ma_hang_hoa as "Mã hàng",
        pt.ten_hang_hoa as "Tên hàng",
        ls.ma_serial as "Serial",
        ls.so_luong as "Số lượng",
        ls.don_gia as "Đơn giá",
        ls.thanh_tien as "Thành tiền",
        h.trang_thai as "Trạng thái HĐ"
      FROM tm_hang_hoa_lich_su ls
      JOIN tm_hang_hoa pt ON ls.ma_hang_hoa = pt.ma_hang_hoa
      LEFT JOIN sys_kho k ON ls.ma_kho_xuat = k.ma_kho
      LEFT JOIN tm_hoa_don h ON ls.so_chung_tu = h.so_hoa_don
      LEFT JOIN dm_doi_tac kh ON h.ma_ben_nhap = kh.ma_doi_tac
      WHERE ls.loai_giao_dich = 'BAN_HANG'
      ORDER BY ls.ngay_giao_dich DESC
    `;
    const salesResult = await pool.query(salesQuery);
    console.log(`   ✓ ${salesResult.rows.length} giao dịch bán`);

    // 4. Chuyển kho
    console.log("📊 Sheet 4: Chuyển kho");
    const transferQuery = `
      SELECT 
        ls.id as "ID",
        ls.ngay_giao_dich as "Ngày chuyển",
        ls.so_chung_tu as "Số phiếu CK",
        k_xuat.ten_kho as "Kho xuất",
        k_nhap.ten_kho as "Kho nhập",
        pt.ma_hang_hoa as "Mã hàng",
        pt.ten_hang_hoa as "Tên hàng",
        ls.ma_serial as "Serial",
        ABS(ls.so_luong) as "Số lượng",
        ls.don_gia as "Đơn giá"
      FROM tm_hang_hoa_lich_su ls
      JOIN tm_hang_hoa pt ON ls.ma_hang_hoa = pt.ma_hang_hoa
      LEFT JOIN sys_kho k_xuat ON ls.ma_kho_xuat = k_xuat.ma_kho
      LEFT JOIN sys_kho k_nhap ON ls.ma_kho_nhap = k_nhap.ma_kho
      WHERE ls.loai_giao_dich = 'CHUYEN_KHO'
      ORDER BY ls.ngay_giao_dich DESC
    `;
    const transferResult = await pool.query(transferQuery);
    console.log(`   ✓ ${transferResult.rows.length} giao dịch chuyển kho`);

    // 5. Tồn kho hiện tại
    console.log("📊 Sheet 5: Tồn kho hiện tại");
    const stockQuery = `
      SELECT 
        tk.id as "ID",
        k.ten_kho as "Kho",
        pt.ma_hang_hoa as "Mã hàng",
        pt.ten_hang_hoa as "Tên hàng",
        pt.ma_nhom_hang as "Nhóm",
        pt.don_vi_tinh as "ĐVT",
        tk.so_luong_ton as "Tồn kho",
        tk.so_luong_khoa as "Đã khóa",
        (tk.so_luong_ton - tk.so_luong_khoa) as "Khả dụng",
        pt.gia_von_mac_dinh as "Giá vốn",
        (tk.so_luong_ton * pt.gia_von_mac_dinh) as "Giá trị tồn"
      FROM tm_hang_hoa_ton_kho tk
      JOIN tm_hang_hoa pt ON tk.ma_hang_hoa = pt.ma_hang_hoa
      JOIN sys_kho k ON tk.ma_kho = k.ma_kho
      WHERE tk.so_luong_ton > 0
      ORDER BY k.ten_kho, pt.ma_nhom_hang, pt.ten_hang_hoa
    `;
    const stockResult = await pool.query(stockQuery);
    console.log(`   ✓ ${stockResult.rows.length} mặt hàng tồn kho`);

    // 6. Xe tồn kho (Serial)
    console.log("📊 Sheet 6: Xe tồn kho (Serial)");
    const vehicleQuery = `
      SELECT 
        s.id as "ID",
        k.ten_kho as "Kho",
        pt.ten_hang_hoa as "Loại xe",
        s.ma_serial as "Serial",
        s.serial_identifier as "Số khung/Số máy",
        s.trang_thai as "Trạng thái",
        s.gia_von as "Giá vốn",
        s.ngay_nhap_kho as "Ngày nhập",
        s.ghi_chu as "Ghi chú"
      FROM tm_hang_hoa_serial s
      JOIN tm_hang_hoa pt ON s.ma_hang_hoa = pt.ma_hang_hoa
      LEFT JOIN sys_kho k ON s.ma_kho_hien_tai = k.ma_kho
      WHERE pt.ma_nhom_hang = 'XE'
      ORDER BY s.trang_thai, k.ten_kho, pt.ten_hang_hoa
    `;
    const vehicleResult = await pool.query(vehicleQuery);
    console.log(`   ✓ ${vehicleResult.rows.length} xe`);

    // Tạo workbook
    console.log("\n📝 Đang tạo file Excel...");
    const wb = XLSX.utils.book_new();

    // Thêm các sheets
    const ws1 = XLSX.utils.json_to_sheet(historyResult.rows);
    XLSX.utils.book_append_sheet(wb, ws1, "Lịch sử tổng hợp");

    const ws2 = XLSX.utils.json_to_sheet(importResult.rows);
    XLSX.utils.book_append_sheet(wb, ws2, "Nhập kho");

    const ws3 = XLSX.utils.json_to_sheet(salesResult.rows);
    XLSX.utils.book_append_sheet(wb, ws3, "Xuất bán");

    const ws4 = XLSX.utils.json_to_sheet(transferResult.rows);
    XLSX.utils.book_append_sheet(wb, ws4, "Chuyển kho");

    const ws5 = XLSX.utils.json_to_sheet(stockResult.rows);
    XLSX.utils.book_append_sheet(wb, ws5, "Tồn kho hiện tại");

    const ws6 = XLSX.utils.json_to_sheet(vehicleResult.rows);
    XLSX.utils.book_append_sheet(wb, ws6, "Xe tồn kho");

    // Lưu file
    const fileName = `BaoCao_NhapXuat_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);

    console.log(`\n✅ Hoàn thành! File đã được lưu: ${fileName}`);
    console.log("\n📋 Tổng kết:");
    console.log(`   - Tổng giao dịch: ${historyResult.rows.length}`);
    console.log(`   - Nhập kho: ${importResult.rows.length}`);
    console.log(`   - Xuất bán: ${salesResult.rows.length}`);
    console.log(`   - Chuyển kho: ${transferResult.rows.length}`);
    console.log(`   - Mặt hàng tồn: ${stockResult.rows.length}`);
    console.log(`   - Xe tồn kho: ${vehicleResult.rows.length}`);
  } catch (error) {
    console.error("❌ Lỗi:", error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

exportInventoryMovements();
