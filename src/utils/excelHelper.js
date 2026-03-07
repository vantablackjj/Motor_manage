const ExcelJS = require("exceljs");

/**
 * Generate Excel from data
 * @param {Array} data - Array of objects
 * @param {Array} columns - Array of { header, key, width }
 * @param {string} sheetName - Name of the sheet
 * @returns {Promise<Buffer>}
 */
const generateExcel = async (data, columns, sheetName = "Sheet1") => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Ensure columns are valid objects with headers
  const validColumns = columns.map((col) => {
    if (typeof col === "string") return { header: col, key: col, width: 15 };
    return {
      header: col.header || col.title || "Untitled",
      key: col.key || col.dataIndex || "",
      width: col.width || 15,
    };
  });

  worksheet.columns = validColumns;

  // Add rows
  worksheet.addRows(data);

  // Style header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  // Auto zebra stripe
  data.forEach((_, index) => {
    if (index % 2 === 0) {
      worksheet.getRow(index + 2).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF9F9F9" },
      };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

module.exports = { generateExcel };
