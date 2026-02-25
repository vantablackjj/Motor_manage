const fs = require("fs");
const logFile = "c:/Users/admin/Documents/Motor_Manage/logs/error.log";
const buffer = fs.readFileSync(logFile);
const content = buffer.toString("utf8");
const lines = content.split("\n").filter((l) => l.trim());
// Filter by approximate time "2026-02-07 01:51" or just last few errors
const relevantErrors = lines.filter(
  (l) => l.includes("2026-02-07 01:51") || l.includes("2026-02-07 08:51"),
);
console.log(relevantErrors.join("\n"));
if (relevantErrors.length === 0) {
  console.log("No error found in log for that time. Showing last 5 errors:");
  console.log(lines.slice(-5).join("\n"));
}
