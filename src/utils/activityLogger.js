const ActivityLog = require("../models/ActivityLog");

class ActivityLogger {
  /**
   * Helper to easily record an activity log
   * @param {Object} req - Request object to extract user, IP, agent
   * @param {string} action - Action performed (CREATE, UPDATE, DELETE, LOGIN, SYNC)
   * @param {string} module - Module affected (orders, inventory, users, auth, etc.)
   * @param {string|number} target_id - ID of the record affected
   * @param {Object} details - Additional data (old/new values)
   */
  static async record(req, action, module, target_id, details = {}) {
    try {
      const user = req.user || {};
      const logData = {
        user_id: user.id || null,
        username: user.username || "system",
        action,
        module,
        target_id: String(target_id) || null,
        details: typeof details === 'object' ? JSON.stringify(details) : details,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.headers["user-agent"],
      };

      await ActivityLog.create(logData);
    } catch (error) {
      // Don't fail the request because a log failed
      console.error("Logger error:", error.message);
    }
  }
}

module.exports = ActivityLogger;
