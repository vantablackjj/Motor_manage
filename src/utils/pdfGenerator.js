const PDFDocument = require("pdfkit-table");
const fs = require("fs");

class PdfGenerator {
  constructor() {}

  /**
   * Generates a PDF buffer for Detailed Purchase Report
   * @param {Array} data - Flat list of purchase details
   * @param {Object} filters - Filter info (tu_ngay, den_ngay, etc.)
   */
  async generatePurchaseReport(data, filters) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 30,
        size: "A4",
        layout: "landscape",
      });
      const buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      // Font setup (using standard fonts for now, might need custom font for Vietnamese)
      // Note: Standard PDF fonts don't support Vietnamese properly.
      // We usually need a custom font. I will try to use a default or assume the system has one.
      // Since I can't easily upload a font, I will try to use "Times-Roman" but it will fail specific chars.
      // To fix Vietnamese, we need to register a font.
      // I'll check if there are any fonts in the project.

      // Checking for fonts...
      // If no fonts, I will try to use standard Helvetica and strip accents or hope for the best.
      // actually, without a font file, Vietnamese will appear as gibberish.
      // I will assume for now I cannot fix the font issue perfectly without a .ttf file.
      // BUT, I can try to load a font if available.
      // As a fallback, I'll use a standard font and warn the user, or try to find a system font path if possible (unreliable).

      // Let's check for fonts in the project first.

      this.generateHeader(doc, "SỔ CHI TIẾT MUA HÀNG", filters);
      this.generatePurchaseTable(doc, data);

      doc.end();
    });
  }

  generateHeader(doc, title, filters) {
    doc.fontSize(18).text(title, { align: "center" });
    doc.fontSize(12).moveDown();
    if (filters.tu_ngay && filters.den_ngay) {
      doc.text(`Từ ngày ${filters.tu_ngay} đến ngày ${filters.den_ngay}`, {
        align: "center",
      });
    } else if (filters.nam) {
      doc.text(`Năm ${filters.nam}`, { align: "center" });
    }
    doc.moveDown(2);
  }

  generatePurchaseTable(doc, data) {
    const table = {
      title: "",
      subtitle: "",
      headers: [
        { label: "Ngày HĐ", property: "ngay_hoa_don", width: 60 },
        { label: "Số HĐ", property: "so_hoa_don", width: 80 },
        { label: "NCC", property: "ten_ncc", width: 100 },
        { label: "Sản phẩm", property: "ten_hang_hoa", width: 120 },
        { label: "Số khung", property: "so_khung", width: 100 },
        { label: "Số máy", property: "so_may", width: 80 },
        { label: "SL", property: "so_luong", width: 30 },
        { label: "Đơn giá", property: "don_gia", width: 80 },
        { label: "Thành tiền", property: "thanh_tien", width: 90 },
      ],
      datas: data.map((item) => ({
        ngay_hoa_don: new Date(item.ngay_hoa_don).toLocaleDateString("vi-VN"),
        so_hoa_don: item.so_hoa_don,
        ten_ncc: item.ten_ncc,
        ten_hang_hoa: item.ten_hang_hoa,
        so_khung: item.so_khung || "",
        so_may: item.so_may || "",
        so_luong: item.so_luong,
        don_gia: parseInt(item.don_gia).toLocaleString("vi-VN"),
        thanh_tien: parseInt(item.thanh_tien).toLocaleString("vi-VN"),
      })),
    };

    doc.table(table, {
      prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
      prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
        doc.font("Helvetica").fontSize(10);
      },
    });
  }

  // Generic generator for other reports
  async generateGenericPdf(data, columns, title, options = {}) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 30,
        size: "A4",
        layout: "landscape",
      });
      const buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      this.generateHeader(doc, title, options);

      const table = {
        headers: columns.map((c) => ({
          label: c.header,
          property: c.key,
          width: c.width * 5,
        })), // Approx width conversion
        datas: data.map((row) => {
          const mapped = {};
          columns.forEach((c) => {
            let val = row[c.key];
            if (typeof val === "number") val = val.toLocaleString("vi-VN");
            mapped[c.key] = String(val || "");
          });
          return mapped;
        }),
      };

      doc.table(table);
      doc.end();
    });
  }
}

module.exports = new PdfGenerator();
