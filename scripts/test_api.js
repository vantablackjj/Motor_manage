require("dotenv").config();
const axios = require("axios");

async function testAPI() {
  try {
    const url = "http://localhost:5000/api/bao-cao/nhap-xuat/xe";
    const params = {
      tu_ngay: "2026-02-01",
      den_ngay: "2026-02-10",
    };

    console.log(`Testing: ${url}`);
    console.log("Params:", params);

    const response = await axios.get(url, { params });

    console.log("\nResponse:");
    console.log("Status:", response.status);
    console.log("Success:", response.data.success);
    console.log(
      "Data length:",
      response.data.data ? response.data.data.length : 0,
    );

    if (response.data.data && response.data.data.length > 0) {
      console.log("\nFirst record:");
      console.log(JSON.stringify(response.data.data[0], null, 2));
    } else {
      console.log("\nNo data returned!");
    }
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message,
    );
  }
}

testAPI();
