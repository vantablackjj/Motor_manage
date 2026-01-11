const axios = require("axios");
const fs = require("fs");
const path = require("path");

const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInZhaV90cm8iOiJBRE1JTiIsIm1hX2tobyI6bnVsbCwiaWF0IjoxNzY3NTMwMTkyLCJleHAiOjE3NjgxMzQ5OTIsImlzcyI6IndhcmVob3VzZS1hcGkifQ.6fTyKUicbQSl38GA2aQk7wC9KPsI86M1rsd-OupBqeE";
const BASE_URL = "http://127.0.0.1:5000/api/export";

async function testExport(module) {
  const url = `${BASE_URL}/${module}`;
  console.log(`\n>>> Testing EXPORT: ${module} on ${url}`);

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      responseType: "arraybuffer",
    });

    console.log("Status:", response.status);
    console.log("Content-Type:", response.headers["content-type"]);
    if (response.status === 200) {
      const filePath = path.join(__dirname, `test_export_${module}.xlsx`);
      fs.writeFileSync(filePath, response.data);
      console.log(`SUCCESS: File saved to ${filePath}`);
    }
  } catch (error) {
    console.error("FAILED:", error.message);
    if (error.response) {
      console.error("Response Status:", error.response.status);
      console.error("Response Data:", error.response.data?.toString());
    }
  }
}

async function run() {
  await testExport("part");
  await testExport("brand");
}

run();
