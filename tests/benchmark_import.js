const ExcelJS = require("exceljs");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

async function generateLargeExcel(rowCount, filePath) {
  console.log(`Generating Excel file with ${rowCount} rows...`);
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    filename: filePath,
  });
  const worksheet = workbook.addWorksheet("Customers");

  // Header
  worksheet
    .addRow(["ma_kh", "ho_ten", "dien_thoai", "dia_chi", "email", "la_ncc"])
    .commit();

  for (let i = 1; i <= rowCount; i++) {
    worksheet
      .addRow([
        `KH${String(i).padStart(7, "0")}`,
        `Customer Name ${i}`,
        `09${String(i).padStart(8, "0")}`,
        `${i} Main St, City`,
        `customer${i}@example.com`,
        i % 10 === 0 ? "true" : "false",
      ])
      .commit();

    if (i % 10000 === 0) console.log(`Generated ${i} rows...`);
  }

  await workbook.commit();
  console.log(`Excel file generated: ${filePath}`);
}

async function testImport(filePath) {
  console.log("Starting import test...");
  const formData = new FormData();
  formData.append("file", fs.createReadStream(filePath));

  const startTime = Date.now();
  try {
    // Lưu ý: Cần Token nếu API yêu cầu authenticate.
    // Ở đây tôi giả sử bạn có thể chạy test trong môi trường dev hoặc disable auth tạm thời để benchmark.
    // Hoặc bạn có thể lấy token từ login API trước.

    console.log("Sending request to /api/import/khach-hang...");
    const response = await axios.post(
      "http://localhost:3000/api/import/khach-hang",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          // 'Authorization': `Bearer ${token}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    const duration = (Date.now() - startTime) / 1000;
    console.log("Import success!");
    console.log("Response:", response.data);
    console.log(`Total time (including upload): ${duration}s`);
  } catch (error) {
    console.error("Import failed:", error.response?.data || error.message);
  }
}

const TEST_FILE = path.join(__dirname, "benchmark_100k.xlsx");
const ROW_COUNT = 100000;

async function runBenchmark() {
  await generateLargeExcel(ROW_COUNT, TEST_FILE);
  // await testImport(TEST_FILE); // Uncomment if server is running and accessible
}

runBenchmark();
