/**
 * Permission-based Access Control Middleware
 * Kiểm tra quyền chi tiết dựa trên JSONB permissions trong sys_role
 */

const { query } = require("../config/database");
const { sendError } = require("../ultils/respone");
const { ROLES } = require("../config/constants");

/**
 * Middleware kiểm tra quyền theo module và action
 * @param {string} module - Tên module (vd: 'products', 'sales_orders', 'inventory')
 * @param {string} action - Hành động (vd: 'view', 'create', 'edit', 'delete', 'approve')
 */
const checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return sendError(res, "Unauthorized", 401);
      }

      // ADMIN luôn có full quyền
      if (user.vai_tro === ROLES.ADMIN) {
        return next();
      }

      // Lấy permissions từ role
      const result = await query(
        `SELECT permissions FROM sys_role WHERE id = $1`,
        [user.role_id],
      );

      if (result.rows.length === 0) {
        return sendError(res, "Role not found", 403);
      }

      const permissions = result.rows[0].permissions;

      // Kiểm tra quyền cụ thể
      if (!permissions[module] || !permissions[module][action]) {
        return sendError(res, "Insufficient permissions", 403, {
          required_permission: `${module}.${action}`,
          your_role: user.vai_tro,
          hint: `Bạn cần quyền "${action}" trên module "${module}"`,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware kiểm tra nhiều quyền (OR logic)
 * User chỉ cần có 1 trong các quyền được liệt kê
 */
const checkAnyPermission = (...permissionPairs) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return sendError(res, "Unauthorized", 401);
      }

      // ADMIN luôn có full quyền
      if (user.vai_tro === ROLES.ADMIN) {
        return next();
      }

      // Lấy permissions từ role
      const result = await query(
        `SELECT permissions FROM sys_role WHERE id = $1`,
        [user.role_id],
      );

      if (result.rows.length === 0) {
        return sendError(res, "Role not found", 403);
      }

      const permissions = result.rows[0].permissions;

      // Kiểm tra xem có ít nhất 1 quyền được thỏa mãn
      const hasPermission = permissionPairs.some(([module, action]) => {
        return permissions[module] && permissions[module][action];
      });

      if (!hasPermission) {
        return sendError(res, "Insufficient permissions", 403, {
          required_permissions: permissionPairs.map(([m, a]) => `${m}.${a}`),
          your_role: user.vai_tro,
          hint: "Bạn cần có ít nhất 1 trong các quyền trên",
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware kiểm tra nhiều quyền (AND logic)
 * User phải có TẤT CẢ các quyền được liệt kê
 */
const checkAllPermissions = (...permissionPairs) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return sendError(res, "Unauthorized", 401);
      }

      // ADMIN luôn có full quyền
      if (user.vai_tro === ROLES.ADMIN) {
        return next();
      }

      // Lấy permissions từ role
      const result = await query(
        `SELECT permissions FROM sys_role WHERE id = $1`,
        [user.role_id],
      );

      if (result.rows.length === 0) {
        return sendError(res, "Role not found", 403);
      }

      const permissions = result.rows[0].permissions;

      // Kiểm tra xem có tất cả các quyền
      const missingPermissions = permissionPairs.filter(([module, action]) => {
        return !permissions[module] || !permissions[module][action];
      });

      if (missingPermissions.length > 0) {
        return sendError(res, "Insufficient permissions", 403, {
          missing_permissions: missingPermissions.map(([m, a]) => `${m}.${a}`),
          your_role: user.vai_tro,
          hint: "Bạn thiếu các quyền trên",
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Helper function để lấy permissions của user hiện tại
 * Dùng trong controller để kiểm tra điều kiện phức tạp
 */
const getUserPermissions = async (userId, roleId) => {
  const result = await query(`SELECT permissions FROM sys_role WHERE id = $1`, [
    roleId,
  ]);

  if (result.rows.length === 0) {
    return {};
  }

  return result.rows[0].permissions;
};

/**
 * Middleware để gắn permissions vào req.user
 * Dùng sau middleware authenticate
 */
const attachPermissions = async (req, res, next) => {
  try {
    if (!req.user || !req.user.role_id) {
      return next();
    }

    const permissions = await getUserPermissions(req.user.id, req.user.role_id);
    req.user.permissions = permissions;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  getUserPermissions,
  attachPermissions,
};
