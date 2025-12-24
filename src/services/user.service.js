const User = require("../models/User");

class UserService {
  static async getByUsername(username) {
    return User.getByUsername(username);
  }

  static async getById(id) {
    const user = await User.getById(id);
    if (!user) {
      throw new Error("User không tồn tại");
    }
    return user;
  }

  static async getAll(filters) {
    return User.getAll(filters);
  }

  static async create(data) {
    // Có thể thêm check trùng username ở đây nếu muốn
    return User.create(data);
  }

  static async update(id, data) {
    const updated = await User.update(id, data);
    if (!updated) {
      throw new Error("Không thể cập nhật user");
    }
    return updated;
  }

  static async changePassword(id, oldPassword, newPassword) {
    return User.changePassword(id, oldPassword, newPassword);
  }

  static async deactivate(id) {
    return User.deactivate(id);
  }

  static async activate(id) {
    return User.activate(id);
  }

  /* ======================
   * QUYỀN KHO
   * ====================== */

  static async getWarehousePermissions(userId) {
    return User.getWarehousePermissions(userId);
  }

  static async assignWarehouse(userId, maKho, permissions) {
    return User.assignWarehouse(userId, maKho, permissions);
  }

  static async removeWarehouse(userId, maKho) {
    return User.removeWarehouse(userId, maKho);
  }
}

module.exports = UserService;
