const axios = require("axios");
const fs = require("fs");
const path = require("path");

const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInZhaV90cm8iOiJBRE1JTiIsIm1hX2tobyI6bnVsbCwiaWF0IjoxNzY3NTMwMTkyLCJleHAiOjE3NjgxMzQ5OTIsImlzcyI6IndhcmVob3VzZS1hcGkifQ.6fTyKUicbQSl38GA2aQk7wC9KPsI86M1rsd-OupBqeE";
const BASE_URL = "http://127.0.0.1:5000/api/export";

async function testExport(module) {
  const url = `${BASE_URL}/${module}`;
  console.log(`\nTesting: ${module}`);

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      responseType: "arraybuffer",
    });

    console.log(`  - Status: ${response.status}`);
    console.log(`  - Content: ${response.headers["content-type"]}`);
    return true;
  } catch (error) {
    console.error(`  - FAILED: ${error.message}`);
    if (error.response) {
      console.error(
        `  - Response: ${error.response.data?.toString() || "No data"}`
      );
    }
    return false;
  }
}

async function run() {
  const modules = [
    "brand",
    "color",
    "warehouse",
    "origin",
    "vehicle-type",
    "customer",
    "part",
    "xe-ton-kho",
    "thu-chi",
    "nhap-kho",
    "nhap-kho-xe",
    "xuat-kho",
    "transfer-xe",
    "transfer-pt",
  ];

  for (const mod of modules) {
    await testExport(mod);
  }
}

run();
