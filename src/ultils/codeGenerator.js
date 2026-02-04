const { query } = require("../config/database");

/**
 * Generates a new code based on a prefix and existing codes in the database.
 * @param {string} tableName - The table to check.
 * @param {string} columnName - The column holding the code (e.g., 'ma_kh', 'ma_hang').
 * @param {string} prefix - The prefix for the code (e.g., 'KH', 'HH').
 * @param {number} length - Total length of the code including prefix (default 6).
 * @returns {Promise<string>} - The new code (e.g., 'KH0001').
 */
async function generateCode(tableName, columnName, prefix, length = 6) {
  // Find the latest code with this prefix
  const sql = `
    SELECT ${columnName} as code
    FROM ${tableName} 
    WHERE ${columnName} LIKE $1 
    ORDER BY  length(${columnName}) DESC, ${columnName} DESC 
    LIMIT 1
  `;

  const result = await query(sql, [`${prefix}%`]);

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
