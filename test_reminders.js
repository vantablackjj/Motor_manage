require("dotenv").config();
const MaintenanceService = require("./src/services/MaintenanceService");

async function test() {
  try {
    const res = await MaintenanceService.getReminders({
      trang_thai: "CHUA_NHAC",
      search: "",
    });
    console.log("Reminders:", res.length);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

test();
