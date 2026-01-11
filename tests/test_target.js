const axios = require("axios");

const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInZhaV90cm8iOiJBRE1JTiIsIm1hX2tobyI6bnVsbCwiaWF0IjoxNzY3NTMwMTkyLCJleHAiOjE3NjgxMzQ5OTIsImlzcyI6IndhcmVob3VzZS1hcGkifQ.6fTyKUicbQSl38GA2aQk7wC9KPsI86M1rsd-OupBqeE";
const BASE_URL = "http://127.0.0.1:5000/api/export";

async function test(mod) {
  try {
    const res = await axios.get(`${BASE_URL}/${mod}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      responseType: "arraybuffer",
    });
    console.log(`${mod}: SUCCESS (${res.status})`);
  } catch (err) {
    console.log(`${mod}: FAILED (${err.response?.status || err.message})`);
    if (err.response) {
      console.log(`  Data: ${err.response.data?.toString().substring(0, 100)}`);
    }
  }
}

async function run() {
  await test("transfer-xe");
  await test("transfer-pt");
  await test("nhap-kho-xe");
  await test("xe-ton-kho");
}
run();
