const ActivityLog = require("../models/ActivityLog");
const { sendSuccess } = require("../utils/response");

class LogController {
  async getAll(req, res, next) {
    try {
      const logs = await ActivityLog.getAll(req.query);
      sendSuccess(res, logs, "Lấy danh sách nhật ký thành công");
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new LogController();
