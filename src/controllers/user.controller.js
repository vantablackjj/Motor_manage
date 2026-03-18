const userService = require("../services/user.service");
const { sendSuccess, sendError } = require("../utils/response");

class UserController {
  async getAll(req, res, next) {
    try {
      const users = await userService.getAll(req.query);
      sendSuccess(res, users);
    } catch (err) {
      next(err);
    }
  }

  async getRoles(req, res, next) {
    try {
      const roles = await userService.getAllRoles();
      sendSuccess(res, roles, "Lấy danh sách vai trò thành công");
    } catch (err) {
      next(err);
    }
  }

  async getPermissions(req, res, next) {
    try {
      const user = await userService.getById(req.params.id);
      if (!user) {
        return sendError(res, "User không tồn tại", 404);
      }
      sendSuccess(
        res,
        user.permissions || {},
        "Lấy danh sách quyền thành công",
      );
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const user = await userService.getById(req.params.id);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }

  async getWarehousePermissions(req, res, next) {
    try {
      const permissions = await userService.getWarehousePermissions(
        req.params.id,
      );
      sendSuccess(res, permissions);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const user = await userService.create(req.body);
      sendSuccess(res, user, "Tạo user thành công");
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const user = await userService.update(req.params.id, req.body);
      sendSuccess(res, user, "Cập nhật user thành công");
    } catch (err) {
      next(err);
    }
  }

  async deactivate(req, res, next) {
    try {
      const user = await userService.deactivate(req.params.id);
      sendSuccess(res, user, "Đã vô hiệu hóa user");
    } catch (err) {
      next(err);
    }
  }

  async activate(req, res, next) {
    try {
      const user = await userService.activate(req.params.id);
      sendSuccess(res, user, "Đã kích hoạt user");
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req, res, next) {
    try {
      await userService.changePassword(
        req.params.id,
        req.body.oldPassword,
        req.body.newPassword,
      );
      sendSuccess(res, null, "Đổi mật khẩu thành công");
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req, res, next) {
    try {
      await userService.resetPassword(req.params.id, req.body.newPassword);
      sendSuccess(res, null, "Đặt lại mật khẩu thành công");
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UserController();
