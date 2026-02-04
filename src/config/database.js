const { Pool } = require("pg");
const logger = require("../ultils/logger");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("render.com")
    ? { rejectUnauthorized: false }
    : false,
  connectionTimeoutMillis: 5000,
});

const query = async (text, params) => {
  if (!global.dbLogged) {
    const redactedUrl = process.env.DATABASE_URL?.replace(
      /:([^:@]+)@/,
      ":****@",
    );
    logger.info("--- DB CONNECTION DEBUG ---");
    logger.info("DATABASE_URL: %s", redactedUrl);
    logger.info("---------------------------");
    global.dbLogged = true;
  }
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.info("executed query", { text, duration, rows: res.rowCount });
    return res;
  } catch (err) {
    logger.error("Error executing query", err);
    throw err;
  }
};

const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  transaction,
};
