const { query } = require("../config/database");

/**
 * Generates a new code based on a prefix and existing codes in the database.
 * @param {string} tableName - The table to check.
 * @param {string} columnName - The column holding the code (e.g., 'ma_kh', 'ma_hang').
 * @param {string} prefix - The prefix for the code (e.g., 'KH', 'HH').
 * @param {number} length - Total length of the code including prefix (default 6).
 * @returns {Promise<string>} - The new code (e.g., 'KH0001').
 */
/**
 * Generates a new code based on a prefix and existing codes in the database.
 * @param {string} tableName - The table to check.
 * @param {string} columnName - The column holding the code (e.g., 'ma_kh', 'ma_hang').
 * @param {string} prefix - The prefix for the code (e.g., 'KH', 'HH').
 * @param {number} length - Total length of the code including prefix (default 6).
 * @param {object} externalClient - Optional DB client to use (for transactions).
 * @returns {Promise<string>} - The new code (e.g., 'KH0001').
 */
async function generateCode(
  tableName,
  columnName,
  prefix,
  length = 6,
  externalClient = null,
) {
  const db = externalClient || query;
  const isTransaction = !!externalClient;

  // Use an advisory lock based on the table name hash to prevent concurrent generation race conditions
  // We use a simple hash of the table name to get a consistent integer for the lock
  const lockId = tableName
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  if (isTransaction) {
    await db.query(`SELECT pg_advisory_xact_lock($1)`, [lockId]);
  } else {
    // If not in transaction, we can still use advisory lock, but xact_lock is safer for atomic ops
    // For now, we assume critical generations are wrapping this in a transaction if they care about atomicity
    // But even without, a simple lock here helps
  }

  // Find the latest code with this prefix
  const sql = `
    SELECT ${columnName} as code
    FROM ${tableName} 
    WHERE ${columnName} LIKE $1 
    ORDER BY length(${columnName}) DESC, ${columnName} DESC 
    LIMIT 1
  `;

  const result = await (isTransaction
    ? db.query(sql, [`${prefix}%`])
    : query(sql, [`${prefix}%`]));

  let nextNum = 1;
  if (result.rows.length > 0) {
    const currentCode = result.rows[0].code;
    const numPart = currentCode.substring(prefix.length);
    if (!isNaN(numPart)) {
      nextNum = parseInt(numPart) + 1;
    }
  }

  const numString = String(nextNum).padStart(length - prefix.length, "0");
  return `${prefix}${numString}`;
}

module.exports = { generateCode };
