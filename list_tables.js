const { Client } = require("pg");
const client = new Client({
  connectionString:
    "postgresql://postgres:password@localhost:5432/Manage_Warehouse",
});

async function listTables() {
  await client.connect();
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  console.log("--- Tables ---");
  res.rows.forEach((row) => console.log(row.table_name));
  await client.end();
}

listTables().catch(console.error);
