require("dotenv").config();
const { pool } = require("./src/config/database");

async function enableExport() {
  const client = await pool.connect();
  try {
    const rolesToUpdate = ["BAN_HANG", "KHO", "KE_TOAN"];

    await client.query("BEGIN");

    for (const roleMa of rolesToUpdate) {
      const { rows } = await client.query(
        "SELECT id, permissions FROM sys_role WHERE ma_quyen = $1",
        [roleMa],
      );
      if (rows.length === 0) continue;

      const roleId = rows[0].id;
      const permissions = rows[0].permissions;

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
        console.log(`Updated export permissions for role: ${roleMa}`);
      } else {
        console.log(`Export permissions already enabled for role: ${roleMa}`);
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
