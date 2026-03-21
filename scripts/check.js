require('dotenv').config();
const { query } = require('../src/config/database');
const User = require('../src/models/User');

async function test() {
  const role_id = 2; // KHO locally
  console.log('--- REBUILDING PERMISSIONS FOR KHO (ID 2) ---');
  await User.rebuildRolePermissions(role_id);
  
  const { rows } = await query("SELECT permissions FROM sys_role WHERE id = $1", [role_id]);
  console.log('Updated JSONB:', JSON.stringify(rows[0].permissions, null, 2));
  
  process.exit();
}
test();
