const PDFDocument = require("pdfkit-table");
const fs = require("fs");
const path = require("path");

class PdfService {
  constructor() {
    this.fontPaths = {
      regular: "C:/Windows/Fonts/arial.ttf",
      bold: "C:/Windows/Fonts/arialbd.ttf",
      italics: "C:/Windows/Fonts/ariali.ttf",
    };
    this.fonts = {
      regular: "Arial",
      bold: "Arial-Bold",
      italics: "Arial-Italic",
    };
  }

  /**
   * Generates a PDF Invoice
   * @param {Object} invoiceData - Full invoice data containing headers and items
   * @param {Object} res - Express response object to stream to
   */
  async generateInvoicePdf(invoiceData, res) {
    const doc = new PDFDocument({ margin: 30, size: "A4" });

    // Try to register fonts
    try {
      if (fs.existsSync(this.fontPaths.regular))
        doc.registerFont(this.fonts.regular, this.fontPaths.regular);
      else this.fonts.regular = "Helvetica";

      if (fs.existsSync(this.fontPaths.bold))
        doc.registerFont(this.fonts.bold, this.fontPaths.bold);
      else this.fonts.bold = "Helvetica-Bold";

      if (fs.existsSync(this.fontPaths.italics))
        doc.registerFont(this.fonts.italics, this.fontPaths.italics);
      else this.fonts.italics = "Helvetica-Oblique";
    } catch (e) {
      console.error("Font registration failed:", e);
      this.fonts = {
        regular: "Helvetica",
        bold: "Helvetica-Bold",
        italics: "Helvetica-Oblique",
      };
    }

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${invoiceData.so_hd}.pdf`,
    );

    doc.pipe(res);

    // --- CONFIGURATION BASED ON TYPE AND STATUS ---
    let title = "HÓA ĐƠN";
    let senderLabel = "Đơn vị bán:";
    let receiverLabel = "Khách hàng:";
    let isDraft = false;

    // Default mapping for BAN_HANG
    let senderName = "CỬA HÀNG XE MÁY & PHỤ TÙNG";
    let senderAddress = "123 Đường ABC, Quận XYZ, TP.HCM";
    let senderPhone = "(028) 1234 5678";

    let receiverName = invoiceData.ten_khach_hang || "Khách lẻ";
    let receiverAddress = invoiceData.dia_chi_kh || "---";
    let receiverPhone = invoiceData.sdt_kh || "---";

    const status = invoiceData.trang_thai || "";

    if (invoiceData.loai_hoa_don === "MUA_HANG") {
      title = "HÓA ĐƠN MUA HÀNG";
      senderLabel = "Nhà cung cấp:";
      receiverLabel = "Kho nhập:";

      senderName = invoiceData.ten_ben_xuat;
      senderAddress = invoiceData.dia_chi_ben_xuat;
      senderPhone = invoiceData.sdt_ben_xuat;

      receiverName = invoiceData.ten_ben_nhap;
      receiverAddress = invoiceData.dia_chi_ben_nhap;
      receiverPhone = "";

      if (["NHAP", "CHO_DUYET"].includes(status)) isDraft = true;
    } else if (invoiceData.loai_hoa_don === "CHUYEN_KHO") {
      title = "HÓA ĐƠN CHUYỂN KHO";
      senderLabel = "Kho xuất:";
      receiverLabel = "Kho nhập:";

      senderName = invoiceData.ten_ben_xuat;
      senderAddress = invoiceData.dia_chi_ben_xuat;
      senderPhone = "";

      receiverName = invoiceData.ten_ben_nhap;
      receiverAddress = invoiceData.dia_chi_ben_nhap;
      receiverPhone = "";

      if (["NHAP", "CHO_DUYET"].includes(status)) isDraft = true;
    } else {
      // BAN_HANG
      senderLabel = "Đơn vị bán:";
      receiverLabel = "Khách hàng:";

      if (["DANG_GIAO", "DA_GIAO", "CHO_GIAO"].includes(status)) {
        title = "PHIẾU GIAO HÀNG";
      } else if (["NHAP", "CHO_DUYET", "GUI_DUYET"].includes(status)) {
        title = "PHIẾU TẠM TÍNH";
        isDraft = true;
      } else {
        title = "HÓA ĐƠN BÁN HÀNG";
      }
    }

    // --- WATERMARK IF DRAFT ---
    if (isDraft) {
      doc.save();
      doc
        .translate(300, 400)
        .rotate(-45)
        .scale(4)
        .fontSize(20)
        .font(this.fonts.bold)
        .fillColor("gray")
        .opacity(0.1)
        .text("BẢN NHÁP", 0, 0, { align: "center" });
      doc.restore();
    }

    // --- HEADER ---
    doc.fontSize(20).text(senderName, { align: "center", underline: true });
    doc.moveDown();

    doc.fontSize(10).text(`Địa chỉ: ${senderAddress || ""}`, {
      align: "center",
    });
    doc.text(`Điện thoại: ${senderPhone || ""}`, {
      align: "center",
    });
    doc.moveDown(2);

    // --- TITLE ---
    doc.fontSize(18).text(title, { align: "center" });
    doc.fontSize(12).text(`Số: ${invoiceData.so_hd}`, { align: "center" });
    if (isDraft) {
      doc
        .fontSize(10)
        .fillColor("red")
        .text("(Chưa chính thức)", { align: "center" });
      doc.fillColor("black");
    }
    doc.moveDown();

    // --- INFO SECTION ---
    const startX = 50;
    const startY = doc.y;

    doc.fontSize(10);
    doc.text(
      `Ngày lập: ${new Date(invoiceData.ngay_ban).toLocaleDateString("vi-VN")}`,
      startX,
      startY,
    );
    doc.text(
      `Người lập: ${invoiceData.ten_nguoi_tao || invoiceData.nguoi_tao || "N/A"}`,
      350,
      startY,
    );

    doc.moveDown();
    const currentY = doc.y;

    // Receiver Info
    doc.font(this.fonts.bold).text(receiverLabel, startX, currentY);
    doc.font(this.fonts.regular).text(receiverName, startX + 70, currentY);

    doc.text(`Địa chỉ: ${receiverAddress}`, startX, currentY + 15);
    if (receiverPhone) doc.text(`SĐT: ${receiverPhone}`, 350, currentY);

    if (invoiceData.ghi_chu) {
      doc.text(`Ghi chú: ${invoiceData.ghi_chu}`, startX, currentY + 30);
      doc.moveDown(2);
    } else {
      doc.moveDown(2);
    }

    // --- TABLE ITEMS ---
    const table = {
      title: "",
      subtitle: "",
      headers: [
        { label: "STT", property: "stt", width: 40, renderer: null },
        {
          label: "Tên Hàng Hóa",
          property: "ten_hang",
          width: 180,
          renderer: null,
        },
        { label: "ĐVT", property: "dvt", width: 50, renderer: null },
        { label: "SL", property: "so_luong", width: 50, renderer: null },
        {
          label: "Đơn Giá",
          property: "don_gia",
          width: 90,
          renderer: (value) => Number(value).toLocaleString("vi-VN"),
        },
        {
          label: "Thành Tiền",
          property: "thanh_tien",
          width: 100,
          renderer: (value) => Number(value).toLocaleString("vi-VN"),
        },
      ],
      datas: [],
    };

    // Combine vehicles and parts into one list
    let stt = 1;
    const allItems = [
      ...(invoiceData.chi_tiet_xe || []),
      ...(invoiceData.chi_tiet_pt || []),
    ];

    allItems.forEach((item) => {
      table.datas.push({
        stt: stt++,
        ten_hang: item.ten_pt || item.ten_hang_hoa || "Sản phẩm",
        dvt: item.don_vi_tinh || "Cái",
        so_luong: item.so_luong,
        don_gia: item.don_gia,
        thanh_tien: item.thanh_tien,
      });
    });

    // Draw the table
    await doc.table(table, {
      prepareHeader: () => doc.font(this.fonts.bold).fontSize(10),
      prepareRow: (row, indexColumn, indexRow, rect, rectRow, key) => {
        doc.font(this.fonts.regular).fontSize(10);
        indexColumn === 0 &&
          doc.addBackground(rectRow, indexRow % 2 ? "blue" : "green", 0.15);
      },
      // Ensure table doesn't break header/status layout too much
    });

    // --- TOTALS ---
    const rightMargin = 500;
    doc.moveDown();
    doc.font(this.fonts.bold);
    doc.text(
      `Tổng tiền: ${Number(invoiceData.tong_tien || 0).toLocaleString("vi-VN")} đ`,
      { align: "right" },
    );

    if (invoiceData.chiet_khau > 0) {
      doc.text(
        `Chiết khấu: -${Number(invoiceData.chiet_khau).toLocaleString("vi-VN")} đ`,
        { align: "right" },
      );
    }

    if (invoiceData.vat > 0) {
      doc.text(`VAT: +${Number(invoiceData.vat).toLocaleString("vi-VN")} đ`, {
        align: "right",
      });
    }

    const thanhToanVal =
      invoiceData.thanh_toan !== undefined
        ? invoiceData.thanh_toan
        : invoiceData.tong_tien || 0;
    doc
      .fontSize(12)
      .text(`Thanh toán: ${Number(thanhToanVal).toLocaleString("vi-VN")} đ`, {
        align: "right",
        underline: true,
      });

    // --- FOOTER ---
    doc.moveDown(4);

    const footerY = doc.y;
    doc.fontSize(10).font(this.fonts.regular);

    // Dynamic footer labels
    let leftSign = "Người lập phiếu";
    let rightSign = "Khách hàng";

    if (invoiceData.loai_hoa_don === "MUA_HANG") {
      leftSign = "Thủ kho (Nhận)";
      rightSign = "Nhà cung cấp (Giao)";
    } else if (invoiceData.loai_hoa_don === "CHUYEN_KHO") {
      leftSign = "Thủ kho xuất";
      rightSign = "Thủ kho nhập";
    }

    doc.text(leftSign, 50, footerY, { align: "center", width: 150 });
    doc.text(rightSign, 350, footerY, { align: "center", width: 150 });

    doc.font(this.fonts.italics);
    doc.text("(Ký, họ tên)", 50, footerY + 15, { align: "center", width: 150 });
    doc.text("(Ký, họ tên)", 350, footerY + 15, {
      align: "center",
      width: 150,
    });

    doc.end();
  }
}

module.exports = new PdfService();
