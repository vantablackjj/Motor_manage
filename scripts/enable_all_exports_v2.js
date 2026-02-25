require("dotenv").config();
const { pool } = require("./src/config/database");

async function enableExport() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      "SELECT id, ma_quyen, permissions FROM sys_role",
    );

    await client.query("BEGIN");

    for (const r of rows) {
      if (r.ma_quyen === "ADMIN") continue;

      const roleId = r.id;
      const permissions = r.permissions;
      let changed = false;

      for (const moduleName in permissions) {
        if (permissions[moduleName].view === true) {
          if (permissions[moduleName].export !== true) {
            permissions[moduleName].export = true;
            changed = true;
          }
        }
      }

      if (changed) {
        await client.query(
          "UPDATE sys_role SET permissions = $1 WHERE id = $2",
          [JSON.stringify(permissions), roleId],
        );
        console.log(`Updated export permissions for role: ${r.ma_quyen}`);
      }
    }

    await client.query("COMMIT");
    console.log("All done!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

enableExport();
