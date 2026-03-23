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
  // Use originalUrl to be absolutely sure we're on the master data list
  if (req.method === "GET" && (req.originalUrl.includes("/api/kho") || req.path.startsWith("/kho"))) {
    return next();
  }

  // Chế độ "Toàn quyền": Chỉ dành cho ADMIN hoặc những tài khoản Quản lý/Kế toán KHÔNG bị gán vào kho cụ thể
  // Nếu đã bị gán vào 1 kho (ma_kho != null), kể cả Quản lý cũng sẽ bị cách ly vào kho đó
  const hasFullAccess =
    user.vai_tro === ROLES.ADMIN ||
    ((user.vai_tro === ROLES.QUAN_LY || user.vai_tro === ROLES.KE_TOAN) &&
      !user.ma_kho);

  const warehouseFields = [
    "ma_kho",
    "kho_id",
    "ma_kho_hien_tai",
    "ma_kho_nhap",
    "ma_kho_xuat",
    "tu_ma_kho",
    "den_ma_kho",
    "ma_ben_nhap",
    "ma_ben_xuat",
    "fromKho",
    "toKho",
    "ma_kho_no",
    "ma_kho_co",
  ];

  const normalizeAndIsolate = (obj) => {
    if (!obj || typeof obj !== "object") return;

    // 1. Normalize: ensure ma_kho is present if any other warehouse field is present
    warehouseFields.forEach((field) => {
      if (obj[field] !== undefined && obj[field] !== null) {
        if (!obj.ma_kho) obj.ma_kho = obj[field];
      }
    });

    // 2. Isolate: For restricted users (non-full access AND has a specific warehouse)
    if (!hasFullAccess && user.ma_kho) {
      // Special check for transfer pairs (source and destination)
      const hasTransferFields = 
        (obj.ma_kho_xuat && obj.ma_kho_nhap) || 
        (obj.ma_ben_xuat && obj.ma_ben_nhap) ||
        (obj.ma_kho_no && obj.ma_kho_co);

      if (hasTransferFields) {
        // For transfers, we MUST ensure the user's warehouse is either the sender or receiver
        const isSender = (obj.ma_kho_xuat === user.ma_kho || obj.ma_ben_xuat === user.ma_kho || obj.ma_kho_co === user.ma_kho);
        const isReceiver = (obj.ma_kho_nhap === user.ma_kho || obj.ma_ben_nhap === user.ma_kho || obj.ma_kho_no === user.ma_kho);

        if (!isSender && !isReceiver) {
          // If neither matches, force the source (or current location) to be the user's warehouse
          if (obj.ma_kho_xuat) obj.ma_kho_xuat = user.ma_kho;
          if (obj.ma_ben_xuat) obj.ma_ben_xuat = user.ma_kho;
          if (obj.ma_kho_co) obj.ma_kho_co = user.ma_kho;
          if (obj.ma_kho) obj.ma_kho = user.ma_kho;
        }
        // Do NOT overwrite the "other" side of the transfer!
        return;
      }

      // Single warehouse field case: standard isolation
      warehouseFields.forEach((field) => {
        if (obj[field] !== undefined && obj[field] !== null) {
          if (obj[field] !== user.ma_kho) {
            obj[field] = user.ma_kho;
          }
        } else if (
          ["ma_kho", "ma_kho_hien_tai", "ma_kho_nhap", "ma_kho_xuat", "ma_ben_nhap", "ma_ben_xuat"].includes(field)
        ) {
          // For GET requests, we only want to inject a generic 'ma_kho' filter
          // Injected specific filters like 'ma_kho_nhap' combined with 'ma_kho_xuat' 
          // often create impossible logic (e.g. source == destination).
          if (req.method === "GET") {
             if (field === "ma_kho") {
               obj[field] = user.ma_kho;
             }
             // Don't inject other fields for GET unless they were already there
          } else {
            // For POST/PUT, we enforce isolation on all fields
            obj[field] = user.ma_kho;
          }
        }
      });
    }
  };

  // Check for restricted access without ma_kho early (for staff roles)
  if (
    !hasFullAccess &&
    [ROLES.BAN_HANG, ROLES.KHO, ROLES.KY_THUAT].includes(user.vai_tro)
  ) {
    if (!user.ma_kho) {
      return sendError(
        res,
        "Bạn chưa được gán vào kho nào. Vui lòng liên hệ Admin.",
        403,
      );
    }
  }

  // Handle all relevant parts of the request
  if (req.query) normalizeAndIsolate(req.query);
  if (req.body) normalizeAndIsolate(req.body);
  if (req.params) normalizeAndIsolate(req.params);

  next();
};

module.exports = { warehouseIsolation };
