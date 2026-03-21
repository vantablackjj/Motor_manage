const { ROLES } = require("../config/constants");
const { sendError } = require("../utils/response");

/**
 * Middleware thực hiện cách ly dữ liệu theo kho
 * Đối với nhân viên (BAN_HANG, KHO, NHAN_VIEN), hệ thống sẽ tự động gán mã kho của họ vào filter
 * Nếu là Quản lý, Kế toán hoặc Admin, họ có quyền xem dữ liệu toàn hệ thống
 */
const warehouseIsolation = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return sendError(res, "Unauthorized", 401);
  }

  // Admin, Quản lý và Kế toán có quyền xem toàn bộ kho
  const hasFullAccess = [
    ROLES.ADMIN,
    ROLES.QUAN_LY,
    ROLES.QUAN_LY_CTY,
    ROLES.KE_TOAN,
  ].includes(user.vai_tro);

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
        if (!obj.ma_kho) obj.ma_kho = obj[field]; // Normalize to ma_kho for services
      }
    });

    // 2. Isolate: only for restricted roles
    if (!hasFullAccess && [ROLES.BAN_HANG, ROLES.KHO, ROLES.KY_THUAT, ROLES.NHAN_VIEN].includes(user.vai_tro)) {
        if (!user.ma_kho) return; // Should have been handled by the check below

        warehouseFields.forEach((field) => {
          if (obj[field] !== undefined && obj[field] !== null) {
            if (obj[field] !== user.ma_kho) {
              obj[field] = user.ma_kho;
            }
          } else if (field === "ma_kho") {
            obj[field] = user.ma_kho;
          }
        });
    }
  };

  // Check for restricted access without ma_kho early
  if (!hasFullAccess && [ROLES.BAN_HANG, ROLES.KHO, ROLES.KY_THUAT, ROLES.NHAN_VIEN].includes(user.vai_tro)) {
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

  // POST/PUT specific body fields
  if (req.method === "POST" || req.method === "PUT") {
    if (!hasFullAccess && [ROLES.BAN_HANG, ROLES.KHO, ROLES.KY_THUAT, ROLES.NHAN_VIEN].includes(user.vai_tro)) {
        if (req.body.ma_kho_nhap) req.body.ma_kho_nhap = user.ma_kho;
        if (req.body.ma_kho_xuat) req.body.ma_kho_xuat = user.ma_kho;
        if (req.body.ma_kho) req.body.ma_kho = user.ma_kho;
    }
  }

  next();
};

module.exports = { warehouseIsolation };
