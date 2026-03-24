const { ROLES } = require("../config/constants");
const { sendError } = require("../utils/response");

/**
 * Middleware thực hiện cách ly dữ liệu theo kho
 * Nếu user được gán mã kho và không phải ADMIN, hệ thống sẽ giới hạn dữ liệu chỉ trong kho đó
 */
const warehouseIsolation = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return sendError(res, "Unauthorized", 401);
  }

  // Allow seeing all warehouses in the list (needed for transfers, etc.)
  if (req.method === "GET" && (req.originalUrl.includes("/api/kho") || req.path.startsWith("/kho"))) {
    return next();
  }

  // Determine the list of effective warehouses this user is restricted to
  // Determine the list of effective warehouses this user is restricted to
  const assignedWarehouses = (user.allowed_warehouses || [])
    .map(k => (typeof k === "string" ? k.trim() : k?.ma_kho?.trim()))
    .filter(Boolean);
  
  if (user.ma_kho) {
    const trimmedHome = user.ma_kho.trim();
    if (!assignedWarehouses.includes(trimmedHome)) {
      assignedWarehouses.push(trimmedHome);
    }
  }
  
  const hasAssignedWarehouses = assignedWarehouses.length > 0;

  // Chế độ "Toàn quyền": Dành cho ADMIN, hoặc QUAN_LY/KE_TOAN mà KHÔNG bị giới hạn bởi danh sách kho gán cụ thể
  const hasFullAccess =
    user.vai_tro === ROLES.ADMIN ||
    ((user.vai_tro === ROLES.QUAN_LY || user.vai_tro === ROLES.KE_TOAN) && !hasAssignedWarehouses);

  if (hasFullAccess) {
    return next();
  }

  // If not full access, the user MUST have at least one assigned warehouse
  if (!hasAssignedWarehouses) {
    const restrictedRoles = [ROLES.BAN_HANG, ROLES.KHO, ROLES.KY_THUAT, ROLES.QUAN_LY, ROLES.KE_TOAN];
    if (restrictedRoles.includes(user.vai_tro)) {
      return sendError(
        res,
        "Bạn chưa được gán vào kho nào. Vui lòng liên hệ Admin.",
        403,
      );
    }
    return next(); // Other roles might not need warehouse isolation
  }

  const defaultWarehouse = assignedWarehouses[0];
  const warehouseFields = [
    "ma_kho", "kho_id", "ma_kho_hien_tai", "ma_kho_nhap", "ma_kho_xuat",
    "tu_ma_kho", "den_ma_kho", "ma_ben_nhap", "ma_ben_xuat",
    "fromKho", "toKho", "ma_kho_no", "ma_kho_co",
  ];

  const normalizeAndIsolate = (obj) => {
    if (!obj || typeof obj !== "object") return;

    // 1. Normalize: ensure ma_kho is present if any other warehouse field is present
    warehouseFields.forEach((field) => {
      const val = obj[field];
      if (val !== undefined && val !== null && val !== "") {
        if (!obj.ma_kho) obj.ma_kho = val;
      }
    });

    // 2. Isolate
    const hasTransferFields = 
      (obj.ma_kho_xuat && obj.ma_kho_nhap) || 
      (obj.ma_ben_xuat && obj.ma_ben_nhap) ||
      (obj.ma_kho_no && obj.ma_kho_co);

    if (hasTransferFields) {
      const isSender = assignedWarehouses.includes(obj.ma_kho_xuat?.toString().trim()) || assignedWarehouses.includes(obj.ma_ben_xuat?.toString().trim()) || assignedWarehouses.includes(obj.ma_kho_co?.toString().trim());
      const isReceiver = assignedWarehouses.includes(obj.ma_kho_nhap?.toString().trim()) || assignedWarehouses.includes(obj.ma_ben_nhap?.toString().trim()) || assignedWarehouses.includes(obj.ma_kho_no?.toString().trim());

      if (!isSender && !isReceiver) {
        if (obj.ma_kho_xuat) obj.ma_kho_xuat = defaultWarehouse;
        if (obj.ma_ben_xuat) obj.ma_ben_xuat = defaultWarehouse;
        if (obj.ma_kho_co) obj.ma_kho_co = defaultWarehouse;
        if (obj.ma_kho) obj.ma_kho = defaultWarehouse;
      }
      return;
    }

      warehouseFields.forEach((field) => {
        const val = obj[field];
        if (val !== undefined && val !== null && val !== "") {
          // Verify if requested warehouse is in the allowed list
          const requested = Array.isArray(val) ? val.map(v => v.toString().trim()) : [val.toString().trim()];
          const allAllowed = requested.every(v => assignedWarehouses.includes(v));
          
          if (!allAllowed) {
            // If any requested is NOT allowed, fallback to default or restrict
            obj[field] = defaultWarehouse;
          }
        } else if (
          ["ma_kho", "ma_ben_nhap", "ma_ben_xuat", "ma_kho_hien_tai", "ma_kho_nhap", "ma_kho_xuat"].includes(field)
        ) {
          if (req.method === "GET") {
             // For GET, if no warehouse is specified (or empty string), show data for ALL assigned warehouses
             obj[field] = assignedWarehouses;
          } else {
            // For POST/PUT, always force to the default warehouse if not specified
            obj[field] = defaultWarehouse;
          }
        }
      });
  };

  if (req.query) normalizeAndIsolate(req.query);
  if (req.body) normalizeAndIsolate(req.body);
  if (req.params) normalizeAndIsolate(req.params);

  next();
};

module.exports = { warehouseIsolation };
