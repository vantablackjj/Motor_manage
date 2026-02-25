require("dotenv").config();
const { pool } = require("./src/config/database");

async function testFinal() {
  try {
    console.log("Testing fn_get_all_child_groups with literal AND cast...");
    const res1 = await pool.query(
      "SELECT group_code FROM fn_get_all_child_groups('XE'::text)",
    );
    console.log("Success 1 (XE::text):", res1.rows.length, "rows");

    console.log(
      "Testing fn_get_all_child_groups with literal ONLY (should work because of overloads)...",
    );
    const res2 = await pool.query(
      "SELECT group_code FROM fn_get_all_child_groups('XE')",
    );
    console.log("Success 2 (XE):", res2.rows.length, "rows");

    console.log("Testing fn_get_all_child_groups with placeholder...");
    const res3 = await pool.query(
      "SELECT group_code FROM fn_get_all_child_groups($1::text)",
      ["XE"],
    );
    console.log("Success 3 ($1::text):", res3.rows.length, "rows");

    console.log("ALL TESTS PASSED - SYSTEM IS STABLE");
  } catch (err) {
    console.error("TEST FAILED:", err.message);
  } finally {
    await pool.end();
  }
}

testFinal();
