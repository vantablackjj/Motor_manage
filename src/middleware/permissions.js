/**
 * Permission-based Access Control Middleware
 * Kiểm tra quyền chi tiết dựa trên JSONB permissions trong sys_role
 */

const { query } = require("../config/database");
const { sendError } = require("../ultils/respone");
const { ROLES } = require("../config/constants");

// ─── Permission Cache ─────────────────────────────────────────────────────────
// Cache permissions theo role_id để tránh query DB mỗi request
// TTL: 5 phút (300_000 ms)
const PERMISSION_CACHE_TTL = 5 * 60 * 1000;
const permissionCache = new Map(); // roleId → { permissions, expiresAt }

/**
 * Lấy permissions từ cache hoặc DB
 */
const fetchPermissions = async (roleId) => {
  const cached = permissionCache.get(roleId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.permissions;
  }

  const result = await query(`SELECT permissions FROM sys_role WHERE id = $1`, [
    roleId,
  ]);

  if (result.rows.length === 0) return null;

  const permissions = result.rows[0].permissions;
  permissionCache.set(roleId, {
    permissions,
    expiresAt: Date.now() + PERMISSION_CACHE_TTL,
  });

  return permissions;
};

/**
 * Xóa cache của một role (gọi sau khi cập nhật quyền role)
 * @param {number|string} [roleId] - ID của role cần xóa cache; bỏ qua để xóa toàn bộ
 */
const clearPermissionCache = (roleId) => {
  if (roleId !== undefined) {
    permissionCache.delete(roleId);
  } else {
    permissionCache.clear();
  }
};

// Tự dọn cache hết hạn mỗi 10 phút để tránh memory leak
setInterval(
  () => {
    const now = Date.now();
    for (const [key, val] of permissionCache.entries()) {
      if (now >= val.expiresAt) permissionCache.delete(key);
    }
  },
  10 * 60 * 1000,
);

// ─── Middleware ───────────────────────────────────────────────────────────────

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

      const permissions = await fetchPermissions(user.role_id);

      if (!permissions) {
        return sendError(res, "Role not found", 403);
      }

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

      const permissions = await fetchPermissions(user.role_id);

      if (!permissions) {
        return sendError(res, "Role not found", 403);
      }

      // Kiểm tra xem có ít nhất 1 quyền được thỏa mãn
      const hasPermission = permissionPairs.some(([mod, act]) => {
        return permissions[mod] && permissions[mod][act];
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

      const permissions = await fetchPermissions(user.role_id);

      if (!permissions) {
        return sendError(res, "Role not found", 403);
      }

      // Kiểm tra xem có tất cả các quyền
      const missingPermissions = permissionPairs.filter(([mod, act]) => {
        return !permissions[mod] || !permissions[mod][act];
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
  const permissions = await fetchPermissions(roleId);
  return permissions || {};
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
  clearPermissionCache,
};
