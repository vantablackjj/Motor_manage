
const { ROLES } = require('../config/constants');
const { sendError } = require('../utils/response');
const { query } = require('../config/database');

/**
 * Middleware kiểm tra vai trò (role-based access control)
 * @param {...string} allowedRoles - Danh sách vai trò được phép
 */
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    // Admin bypasses all checks
    if (req.user.vai_tro === ROLES.ADMIN) {
      return next();
    }

    if (!allowedRoles.includes(req.user.vai_tro)) {
      return sendError(res, 'Insufficient permissions', 403, {
        required_roles: allowedRoles,
        your_role: req.user.vai_tro
      });
    }

    next();
  };
};

/**
 * Middleware kiểm tra quyền cụ thể (Authority-based)
 * Hỗ trợ cả 2 cách gọi: 
 * 1. checkPermission('users.view')
 * 2. checkPermission('users', 'view')
 * @param {string} moduleOrFull - Tên module hoặc mã quyền đầy đủ
 * @param {string} [action] - Hành động (nếu tham số đầu là module)
 */
const checkPermission = (moduleOrFull, action = null) => {
  const requiredPermission = action ? `${moduleOrFull}.${action}` : moduleOrFull;
  
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    // Admin bypasses all checks
    if (req.user.vai_tro === ROLES.ADMIN) {
      return next();
    }

    const authorities = req.user.authorities || [];
    
    // Check main permission
    if (authorities.includes(requiredPermission)) {
      return next();
    }

    // Legacy fallback check - Expanded to handle all known pairs
    const legacyMap = {
      'sales_orders': 'don_hang_ban_xe',
      'purchase_orders': 'don_hang_mua_xe',
      'reports': 'bao_cao',
      'inventory': 'ton_kho',
      'maintenance': 'sua_chua'
    };

    const parts = requiredPermission.split('.');
    if (parts.length === 2) {
      const [mod, act] = parts;
      
      // Try mapping modern -> legacy
      const legacyMod = legacyMap[mod];
      if (legacyMod && authorities.includes(`${legacyMod}.${act}`)) {
        return next();
      }

      // Try mapping legacy -> modern (reverse)
      const modernMod = Object.keys(legacyMap).find(key => legacyMap[key] === mod);
      if (modernMod && authorities.includes(`${modernMod}.${act}`)) {
        return next();
      }
    }

    return sendError(res, `Permission denied: ${requiredPermission}`, 403, {
      required_permission: requiredPermission,
      your_role: req.user.vai_tro,
      your_authorities: authorities
    });

    next();
  };
};

/**
 * Middleware kiểm tra quyền truy cập kho
 * @param {string} ma_kho_param - Tên parameter chứa mã kho (mặc định: 'ma_kho')
 */
const checkWarehouseAccess = (ma_kho_param = 'ma_kho') => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return sendError(res, 'Unauthorized', 401);
      }
      
      // Admin và Quản lý công ty có quyền truy cập tất cả kho
      if (user.vai_tro === ROLES.ADMIN || user.vai_tro === ROLES.QUAN_LY_CTY) {
        return next();
      }
      
      // Lấy mã kho từ params hoặc body
      const ma_kho = req.params[ma_kho_param] || req.body[ma_kho_param];
      
      if (!ma_kho) {
        return sendError(res, 'Warehouse code required', 400);
      }
      
      // Ưu tiên sử dụng danh sách đã được warehouseIsolation chuẩn hóa
      if (user.authorized_warehouses) {
        if (user.authorized_warehouses.includes(ma_kho)) {
          return next();
        }
      }

      // Fallback: Kiểm tra trực tiếp kho "nhà"
      if (user.ma_kho === ma_kho) {
        return next();
      }

      // Kiểm tra user có quyền truy cập kho này trong bảng phân quyền chi tiết
      const result = await query(
        `SELECT quyen_xem FROM sys_user_kho 
         WHERE user_id = $1 AND ma_kho = $2`,
        [user.id, ma_kho]
      );
      
      if (result.rows.length === 0 || !result.rows[0].quyen_xem) {
        return sendError(res, 'No access to this warehouse', 403, {
          warehouse: ma_kho
        });
      }
      
      // Gắn thông tin quyền vào request để dùng sau
      req.warehousePermissions = result.rows[0];
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware kiểm tra quyền thao tác (thêm/sửa/xóa) trên kho
 * @param {string} permission - Loại quyền: 'quyen_them', 'quyen_sua', 'quyen_xoa', 'quyen_chuyen_kho'
 */
const checkWarehousePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return sendError(res, 'Unauthorized', 401);
      }
      
      // Admin có full quyền
      if (user.vai_tro === ROLES.ADMIN) {
        return next();
      }
      
      // Lấy mã kho
      const ma_kho = req.params.ma_kho || req.body.ma_kho || req.body.ma_kho_xuat;
      
      if (!ma_kho) {
        return sendError(res, 'Warehouse code required', 400);
      }
      
      // Nếu là kho "nhà" của user, mặc định có toàn quyền thao tác 
      // đối với các role Nhân viên/Quản lý chi nhánh
      if (user.ma_kho === ma_kho) {
        return next();
      }

      // Kiểm tra quyền cụ thể trong bảng phân quyền chi tiết
      const result = await query(
        `SELECT ${permission} FROM sys_user_kho 
         WHERE user_id = $1 AND ma_kho = $2`,
        [user.id, ma_kho]
      );
      
      if (result.rows.length === 0 || !result.rows[0][permission]) {
        return sendError(res, `No permission: ${permission}`, 403, {
          warehouse: ma_kho,
          required_permission: permission
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware kiểm tra user có phải là owner của resource
 * @param {Function} getOwnerId - Function để lấy owner_id từ resource
 */
const checkOwnership = (getOwnerId) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return sendError(res, 'Unauthorized', 401);
      }
      
      // Admin có thể truy cập tất cả
      if (user.vai_tro === ROLES.ADMIN) {
        return next();
      }
      
      // Lấy owner_id của resource
      const ownerId = await getOwnerId(req);
      
      if (ownerId !== user.id) {
        return sendError(res, 'You can only access your own resources', 403);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware kiểm tra ít nhất 1 trong các quyền (OR logic)
 * @param {...(string|[string, string])} permissions - Danh sách quyền
 */
const checkAnyPermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    // Admin bypasses all checks
    if (req.user.vai_tro === ROLES.ADMIN) {
      return next();
    }

    const userAuthorities = req.user.authorities || [];
    
    // Mapping of modern prefixes to their legacy counterparts
    const legacyMap = {
      'sales_orders': 'don_hang_ban_xe',
      'purchase_orders': 'don_hang_mua_xe',
      'reports': 'bao_cao',
      'inventory': 'ton_kho',
      'maintenance': 'sua_chua'
    };

    const hasAny = permissions.some(p => {
      const [mod, act] = Array.isArray(p) ? [p[0], p[1]] : p.split('.');
      
      // Check modern version
      if (userAuthorities.includes(`${mod}.${act}`)) return true;
      
      // Check legacy version if applicable
      const legacyMod = legacyMap[mod];
      if (legacyMod && userAuthorities.includes(`${legacyMod}.${act}`)) return true;

      // Check reverse
      const modernMod = Object.keys(legacyMap).find(key => legacyMap[key] === mod);
      if (modernMod && userAuthorities.includes(`${modernMod}.${act}`)) return true;

      return false;
    });

    // Special Fallback for Dashboard/Reports if authority check fails
    // If the check is for reports.view or similar overview permissions, allow recognized roles
    const isReportCheck = permissions.some(p => {
      const mod = Array.isArray(p) ? p[0] : p.split('.')[0];
      return ['reports', 'bao_cao', 'sales_orders', 'don_hang_ban_xe', 'inventory', 'ton_kho'].includes(mod);
    });

    const allowedRoles = [
      ROLES.ADMIN, ROLES.QUAN_LY, ROLES.KE_TOAN, ROLES.BAN_HANG, 
      ROLES.KHO, 'NHAN_VIEN', 'SALE', 'WAREHOUSE'
    ];
    if (!hasAny && isReportCheck && allowedRoles.includes(req.user.vai_tro)) {
        return next();
    }

    if (!hasAny) {
      return sendError(res, 'Insufficient permissions', 403, {
        required_any_of: permissions.map(p => Array.isArray(p) ? `${p[0]}.${p[1]}` : p),
        your_role: req.user.vai_tro,
        your_authorities: userAuthorities
      });
    }

    next();
  };
};

module.exports = {
  checkRole,
  checkPermission,
  checkAnyPermission,
  checkWarehouseAccess,
  checkWarehousePermission,
  checkOwnership
};
