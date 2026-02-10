require("dotenv").config();
const fs = require("fs");
const baoCaoService = require("./src/services/baoCao.service");

async function testService() {
  try {
    console.log("Testing nhapXuatXe service...");

    const filters = {
      tu_ngay: "2026-02-01",
      den_ngay: "2026-02-10",
    };

    const result = await baoCaoService.nhapXuatXe(filters);

    console.log(`Result: ${result.length} records`);

    // Save to file
    fs.writeFileSync(
      "test_result.json",
      JSON.stringify(result, null, 2),
      "utf8",
    );
    console.log("Result saved to test_result.json");

    if (result.length > 0) {
      console.log("\nFirst record keys:");
      console.log(Object.keys(result[0]).join(", "));
    } else {
      console.log("NO DATA RETURNED!");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

testService();
