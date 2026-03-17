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

  if (hasFullAccess) {
    return next();
  }

  // Đối với Nhân viên (BAN_HANG, KHO, NHAN_VIEN), buộc phải lọc theo kho của họ
  if ([ROLES.BAN_HANG, ROLES.KHO, ROLES.NHAN_VIEN].includes(user.vai_tro)) {
    if (!user.ma_kho) {
      return sendError(
        res,
        "Bạn chưa được gán vào kho nào. Vui lòng liên hệ Admin.",
        403,
      );
    }

    const forceWarehouse = (obj) => {
      if (!obj || typeof obj !== "object") return;

      // 1. Force top-level warehouse fields if they exist
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
      ];

      warehouseFields.forEach((field) => {
        if (obj[field] !== undefined && obj[field] !== null) {
          // If the field targets a different warehouse, override it
          if (obj[field] !== user.ma_kho) {
            obj[field] = user.ma_kho;
          }
        }
      });

      // Special case for transfers: at least one side must be theirs
      // The logic above forces BOTH to be theirs, which is safer for a warehouse staff (they can only move within their kho?)
      // Actually, for transfers between warehouses, we might want to allow moving OUT of their kho to another.
      // But if they are just warehouse staff, they shouldn't even be initiating inter-warehouse transfers without supervision.
      // Let's stick to a strict rule: if they are restricted, they work ONLY with their warehouse.

      // Handle nested params object
      if (obj.params && typeof obj.params === "object") {
        forceWarehouse(obj.params);
      }
    };

    // 1. Xử lý Query String
    if (req.query) forceWarehouse(req.query);

    // 2. Xử lý Request Body
    if (req.body) forceWarehouse(req.body);

    // 3. Xử lý URL Params
    if (req.params) forceWarehouse(req.params);

    // 4. Double check for POST/PUT specific body fields based on common patterns
    if (req.method === "POST" || req.method === "PUT") {
      if (req.body.ma_kho_nhap) req.body.ma_kho_nhap = user.ma_kho;
      if (req.body.ma_kho_xuat) req.body.ma_kho_xuat = user.ma_kho;
      if (req.body.ma_kho) req.body.ma_kho = user.ma_kho;
    }
  }

  next();
};

module.exports = { warehouseIsolation };
